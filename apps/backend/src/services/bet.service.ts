import { Knex } from 'knex';
import { Instrument, Bet, BetStatus, LedgerEntryType, RoundStatus } from '@rangeclick/types';
import { LedgerService } from './ledger.service';
import { RoundService } from './round.service';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiter, SecurityService } from './security.service';
import { MetricsService } from './metrics.service';
import { MarketService } from './market.service';
import { EventBus } from './event.bus';

export class BetService {
  private rateLimiter = new RateLimiter();

  constructor(
    private knex: Knex,
    private ledgerService: LedgerService,
    private roundService: RoundService,
    private securityService: SecurityService,
    private metricsService: MetricsService,
    private marketService: MarketService,
    private eventBus: EventBus
  ) {}

  async getActiveBets(userId: string): Promise<Bet[]> {
    const rows = await this.knex('bets')
      .where({ user_id: userId, status: BetStatus.PLACED })
      .orderBy('created_at', 'desc');
    return rows.map(r => this.mapBet(r));
  }

  async getBetHistory(userId: string): Promise<Bet[]> {
    const rows = await this.knex('bets')
      .where({ user_id: userId })
      .whereNot({ status: BetStatus.PLACED })
      .orderBy('created_at', 'desc')
      .limit(50);
    return rows.map(r => this.mapBet(r));
  }

  async getSettlementsForRound(roundId: string): Promise<Bet[]> {
    const rows = await this.knex('bets')
      .where({ round_id: roundId })
      .whereIn('status', [BetStatus.WON, BetStatus.LOST]);
    return rows.map(r => this.mapBet(r));
  }

  async placeBet(params: {
    userId: string;
    roundId: string;
    tileId: string;
    amount: number;
    tile: { min: number; max: number };
    multiplier: number;
    idempotencyKey?: string;
  }): Promise<Bet> {
    const { userId, roundId, tileId, amount, tile, multiplier, idempotencyKey } = params;
    const start = Date.now();

    // 0. Market Health Check (Section 10.3)
    const round = await this.knex('rounds').where({ id: roundId }).first();
    if (!round) throw new Error('Round not found');

    const sourceCount = this.marketService.getHealthySourceCount(round.instrument);
    if (sourceCount < 2) {
        throw new Error('Betting is currently frozen due to insufficient price sources.');
    }

    // 1. Rate Limiting
    if (this.rateLimiter.isLimited(userId, 5, 2000)) {
        await this.securityService.logAbuseEvent({
            userId,
            type: 'RATE_LIMIT',
            severity: 'LOW',
            metadata: { limit: 5, window: 2000 }
        });
        throw new Error('Rate limit exceeded. Too many bets.');
    }

    // 1. User Responsible Limits Check
    const limits = await this.knex('user_limits').where({ user_id: userId }).first() || { max_bet_amount: 1000, max_bets_per_round: 10 };
    
    if (amount > parseFloat(limits.max_bet_amount)) {
        throw new Error(`Bet amount exceeds your limit of $${limits.max_bet_amount}`);
    }

    const betsInRound = await this.knex('bets').where({ user_id: userId, round_id: roundId }).count('* as total').first();
    if (Number(betsInRound?.total || 0) >= limits.max_bets_per_round) {
        throw new Error(`Maximum bets per round reached (${limits.max_bets_per_round})`);
    }

    // 2. Idempotency Check
    if (idempotencyKey) {
        const existing = await this.knex('bets').where({ idempotency_key: idempotencyKey }).first();
        if (existing) {
            return this.mapBet(existing);
        }
    }

    // 2. Validate Round Logic & Strict Cutoff
    const roundData = await this.knex('rounds').where({ id: roundId }).first();
    
    if (!roundData) throw new Error('Round not found');
    
    const nowTs = Date.now();
    if (nowTs >= roundData.cutoff_ts) {
        await this.securityService.logAbuseEvent({
            userId,
            type: 'CUTOFF_SNIPING',
            severity: 'MEDIUM',
            metadata: { now: nowTs, cutoff: roundData.cutoff_ts, diff: nowTs - roundData.cutoff_ts }
        });
        throw new Error(`Round is closed (Cutoff reached). Current: ${nowTs}, Cutoff: ${roundData.cutoff_ts}`);
    }
    if (roundData.status !== RoundStatus.OPEN) {
        throw new Error('Round is not open for betting');
    }

    // 3. Execute Transaction
    return this.knex.transaction(async (trx) => {
      console.log('Starting bet transaction...');
      // A. Get Wallet
      const wallet = await this.ledgerService.ensureWallet(userId, trx);

      const betId = uuidv4();
      const now = new Date();

      console.log('Inserting bet:', betId);
      // B. Create Bet Record
      // SQLite returning('*') workaround: we already have the ID
      await trx('bets')
        .insert({
          id: betId,
          user_id: userId,
          round_id: roundId,
          tile_id: tileId,
          amount,
          multiplier,
          min_price: tile.min,
          max_price: tile.max,
          status: BetStatus.PLACED,
          payout: 0,
          idempotency_key: idempotencyKey,
          created_at: now
        });

      console.log('Bet inserted, debiting ledger...');

      // C. Debit Ledger
      await this.ledgerService.createEntry(trx, {
        userId,
        walletId: wallet.id,
        type: LedgerEntryType.BET_PLACED,
        amount: -amount,
        currency: 'USD',
        refType: 'BET',
        refId: betId
      });

      this.metricsService.increment('betPlacementCount');
      this.metricsService.recordPlacementLatency(Date.now() - start);

      const newBalance = parseFloat(wallet.balance) - amount;
      this.eventBus.publish('WALLET_UPDATE', { userId, balance: newBalance });

      const result = {
        id: betId,
        userId,
        roundId,
        tileId,
        amount,
        multiplier,
        status: BetStatus.PLACED,
        payout: 0,
        createdAt: now.getTime()
      };
      console.log('Returning bet result:', result);
      return result;
    });
  }

  // Settlement Logic (Called by GameLoop event or scheduler)
  async settleBetsForRound(roundId: string, closePrice: number) {
    // 1. Fetch all active bets for round
    const bets = await this.knex('bets')
      .where({ round_id: roundId, status: BetStatus.PLACED });

    console.log(`⚖️ Settling ${bets.length} bets for round ${roundId} @ ${closePrice}`);

    for (const bet of bets) {
      await this.knex.transaction(async (trx) => {
        const min = parseFloat(bet.min_price);
        const max = parseFloat(bet.max_price);
        const amount = parseFloat(bet.amount);
        const multiplier = parseFloat(bet.multiplier);

        const won = closePrice >= min && closePrice < max;
        
        if (won) {
          const payout = amount * multiplier;
          
          // Update Bet
          await trx('bets').where({ id: bet.id }).update({
            status: BetStatus.WON,
            payout
          });

          // Credit Wallet
          const wallet = await this.ledgerService.getWallet(bet.user_id, 'USD', trx);
          const entry = await this.ledgerService.createEntry(trx, {
            userId: bet.user_id,
            walletId: wallet.id,
            type: LedgerEntryType.BET_WIN,
            amount: payout,
            currency: 'USD',
            refType: 'BET',
            refId: bet.id
          });

          this.eventBus.publish('WALLET_UPDATE', { userId: bet.user_id, balance: entry.balanceAfter });
        } else {
          // Update Bet (Loss)
          await trx('bets').where({ id: bet.id }).update({
            status: BetStatus.LOST,
            payout: 0
          });
        }
      });
    }

    // Check for win-rate anomalies after settlement
    const userIds = [...new Set(bets.map(b => b.user_id))];
    for (const uid of userIds) {
        await this.securityService.detectWinRateAnomaly(uid);
    }
  }

  private mapBet(row: any): Bet {
      return {
        id: row.id,
        userId: row.user_id,
        roundId: row.round_id,
        tileId: row.tile_id,
        amount: parseFloat(row.amount),
        multiplier: parseFloat(row.multiplier),
        status: row.status,
        payout: parseFloat(row.payout),
        createdAt: new Date(row.created_at).getTime()
      };
  }
}
