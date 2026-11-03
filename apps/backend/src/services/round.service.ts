import { Knex } from 'knex';
import { Instrument, Round, RoundStatus, TimeFrame } from '@rangeclick/types';
import { v4 as uuidv4 } from 'uuid';
import { GridService } from './grid.service';

export class RoundService {
  private gridService = new GridService();

  constructor(private knex: Knex) {}

  // Generate ID: BTC-60-1700000060
  private getRoundId(instrument: Instrument, tf: TimeFrame, expiryTs: number): string {
    return `${instrument}-${tf}-${expiryTs}`;
  }

  // Ensure rounds exist for the next N periods
  async ensureRounds(instrument: Instrument, tf: TimeFrame, currentPrice: number, marketService: any) {
    const now = Date.now();
    const periodMs = tf * 1000;
    
    const currentCandleStart = Math.floor(now / periodMs) * periodMs;
    const nextExpiry = currentCandleStart + periodMs;
    
    // Generate 12 future expiries (width)
    const expiries = Array.from({ length: 12 }, (_, i) => nextExpiry + (i * periodMs));

    for (const expiry of expiries) {
      const id = this.getRoundId(instrument, tf, expiry);
      const timeHorizonMs = Math.max(expiry - now, 1);

      await this.knex.transaction(async (trx) => {
        const existing = await trx('rounds').where({ id }).forUpdate().first();

        if (!existing) {
          const cutoffMs = tf === 300 ? 30000 : tf === 60 ? 5000 : 3000;
          await trx('rounds').insert({
            id,
            instrument,
            tf,
            expiry_ts: expiry,
            cutoff_ts: expiry - cutoffMs,
            status: RoundStatus.OPEN
          });

          const history = marketService.getHistoryWithTimestamps(instrument);
          const tiles = this.gridService.generateTilesForPrice(id, instrument, currentPrice, history, timeHorizonMs);
          await trx('round_tiles').insert(tiles);

          console.log(`✨ Created Round: ${id} with ${tiles.length} tiles (Volatility-aware)`);
          return;
        }

        // Tiles are a snapshot taken at round-creation time, but the live price keeps
        // moving. Re-center the grid on the current price as long as nobody has bet on
        // this round yet (once a bet exists, the grid must stay fixed to be fair) and
        // it hasn't reached cutoff, otherwise long-lived rounds end up with their whole
        // probability window stranded far from where the price actually ended up.
        if (existing.status !== RoundStatus.OPEN) return;

        const hasBet = await trx('bets').where({ round_id: id }).first();
        if (hasBet) return;

        const tiles = await trx('round_tiles').where({ round_id: id }).orderBy('min_price', 'asc');
        if (tiles.length === 0) return;

        const gridMin = Number(tiles[0].min_price);
        const gridMax = Number(tiles[tiles.length - 1].max_price);
        const step = (gridMax - gridMin) / tiles.length;
        const driftedOutOfRange = currentPrice <= gridMin + step || currentPrice >= gridMax - step;
        if (!driftedOutOfRange) return;

        const history = marketService.getHistoryWithTimestamps(instrument);
        const freshTiles = this.gridService.generateTilesForPrice(id, instrument, currentPrice, history, timeHorizonMs);
        await trx('round_tiles').where({ round_id: id }).del();
        await trx('round_tiles').insert(freshTiles);
      });
    }
  }

  async getTilesForRound(roundId: string) {
    return this.knex('round_tiles').where({ round_id: roundId });
  }

  async persistOracleSample(roundId: string, instrument: string, snapshot: any) {
    await this.knex('oracle_samples').insert({
      id: uuidv4(),
      round_id: roundId,
      instrument,
      computed_price: snapshot.computedPrice,
      source_prices: JSON.stringify(snapshot.sources),
      source_count: snapshot.sourceCount,
      decision_path: snapshot.decision_path || 'UNKNOWN'
    });
  }

  async getRoundAudit(roundId: string) {
    return this.knex('oracle_samples').where({ round_id: roundId }).first();
  }

  async getActiveRounds(instrument: Instrument, tf?: number): Promise<Round[]> {
    let query = this.knex('rounds')
      .where({ instrument })
      .whereIn('status', [RoundStatus.OPEN, RoundStatus.CUTOFF])
      .orderBy('expiry_ts', 'asc');
    if (tf !== undefined) {
      query = query.where({ tf });
    }
    return query;
  }

  async lockRound(roundId: string) {
    await this.knex('rounds')
      .where({ id: roundId, status: RoundStatus.OPEN })
      .update({ status: RoundStatus.CUTOFF });
    console.log(`🔒 Round Cutoff: ${roundId}`);
  }

  async setSettling(roundId: string): Promise<boolean> {
     const updated = await this.knex('rounds')
      .where({ id: roundId })
      .whereIn('status', [RoundStatus.OPEN, RoundStatus.CUTOFF])
      .update({ status: RoundStatus.SETTLING });
     
     return updated > 0;
  }

  async setDelayed(roundId: string) {
    await this.knex('rounds')
      .where({ id: roundId })
      .update({ status: RoundStatus.DELAYED });
  }

  async completeRound(roundId: string, closePrice: number) {
     await this.knex('rounds')
      .where({ id: roundId })
      .update({ 
        status: RoundStatus.SETTLED,
        oracle_close: closePrice
      });
     console.log(`✅ Round Settled: ${roundId} @ ${closePrice}`);
  }

  async refundRound(roundId: string, ledgerService: any) {
    const bets = await this.knex('bets').where({ round_id: roundId, status: 'PLACED' });
    console.log(`⚠️ Refunding ${bets.length} bets for round ${roundId}`);

    for (const bet of bets) {
      await this.knex.transaction(async (trx) => {
        // Update bet status
        await trx('bets').where({ id: bet.id }).update({ status: 'REFUNDED' });

        // Credit wallet
        const wallet = await ledgerService.getWallet(bet.user_id, 'USD', trx);
        await ledgerService.createEntry(trx, {
          userId: bet.user_id,
          walletId: wallet.id,
          type: 'REFUND',
          amount: parseFloat(bet.amount),
          currency: 'USD',
          refType: 'ROUND',
          refId: roundId
        });
      });
    }

    await this.knex('rounds').where({ id: roundId }).update({ status: 'REFUNDED' });
  }
}
