import { Instrument, RoundStatus, TimeFrame } from '@rangeclick/types';
import { RoundService } from './round.service';
import { MarketService } from './market.service';
import { EventBus } from './event.bus';
import { BetService } from './bet.service';
import { MerkleService } from './merkle.service';
import { LedgerService } from './ledger.service';
import { MetricsService } from './metrics.service';
import { ReconciliationService } from './reconciliation.service';
import { SecurityService } from './security.service';
import { StrategyBService } from './strategy-b.service';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';

export class GameLoop {
  private running = false;
  private interval: NodeJS.Timeout | null = null;
  private merkleService = new MerkleService();

  constructor(
    private knex: Knex,
    private roundService: RoundService,
    private marketService: MarketService,
    private betService: BetService,
    private ledgerService: LedgerService,
    private metricsService: MetricsService,
    private reconciliationService: ReconciliationService,
    private securityService: SecurityService,
    private strategyBService: StrategyBService,
    private eventBus: EventBus
  ) {
    // Automated Reconciliation Task (Section 16.4)
    setInterval(() => this.runDailyReconciliation(), 1000 * 60 * 60); // Every 1 hour
  }

  private async runDailyReconciliation() {
    const report = await this.reconciliationService.reconcileAllWallets();
    if (report.mismatchCount > 0) {
        await this.securityService.logAbuseEvent({
            type: 'LEDGER_MISMATCH',
            severity: 'HIGH',
            metadata: report
        });
    }
  }

  start() {
    this.running = true;
    console.log('🔄 Game Loop Started');
    
    // Tick every 500ms
    this.interval = setInterval(() => this.tick(), 500);
  }

  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
  }

  private async tick() {
    const now = Date.now();
    const instruments = [Instrument.BTC, Instrument.ETH];
    const tfs = [TimeFrame.TF_60S];

    for (const inst of instruments) {
      const currentPrice = this.marketService.getCurrentPrice(inst);
      if (currentPrice === 0) continue; // Wait for first tick

      for (const tf of tfs) {
        // 1. Ensure future rounds exist
        await this.roundService.ensureRounds(inst, tf, currentPrice, this.marketService);

        // 2. Fetch Active and Delayed rounds (Section 5.4)
        const rounds = await this.roundService.getActiveRounds(inst);
        const delayedRounds = await this.knex('rounds').where({ instrument: inst, status: RoundStatus.DELAYED });
        const allPendingRounds = [...rounds, ...delayedRounds];
        
        for (const round of allPendingRounds) {
          // Check Cutoff
          if (round.status === RoundStatus.OPEN && now >= round.cutoff_ts) {
            await this.roundService.lockRound(round.id);
            this.eventBus.publish('ROUND_STATE', round);
          }

          // Check Expiry OR Retry
          if (now >= round.expiry_ts) {
             const settlementStart = Date.now();
             
             // Atomic Claim (Only for non-delayed)
             if (round.status !== RoundStatus.DELAYED) {
                const claimed = await this.roundService.setSettling(round.id);
                if (!claimed) continue; 
             }

             // Check Oracle Health (Section 5.4)
             const sourceCount = this.marketService.getHealthySourceCount(inst);
             if (sourceCount < 2) {
                const timeSinceExpiry = now - round.expiry_ts;
                if (timeSinceExpiry < 30000) { // Delay up to 30s
                    if (round.status !== RoundStatus.DELAYED) {
                        console.log(`⏳ Insufficient sources for ${round.id}. Delaying settlement...`);
                        await this.roundService.setDelayed(round.id);
                        this.eventBus.publish('ROUND_DELAYED', { round });
                    }
                    continue; 
                } else {
                    console.log(`❌ Still insufficient sources after 30s for ${round.id}. Refunding...`);
                    await this.roundService.refundRound(round.id, this.ledgerService);
                    this.eventBus.publish('ROUND_REFUNDED', { round });
                    continue;
                }
             }
             
             // Get precise price snapshot at expiry using interpolation (Section 5.3)
             const { price: closePrice, decision } = this.marketService.getInterpolatedPrice(inst, Number(round.expiry_ts));
             const snapshot = this.marketService.getPriceSnapshot(inst);

             // Persist audit log with decision path
             await this.roundService.persistOracleSample(round.id, inst, { ...snapshot, computedPrice: closePrice, decision_path: decision });
             
             // 1. Settle Bets in DB
             await this.betService.settleBetsForRound(round.id, closePrice);

             // 2. Generate Integrity Anchor (Merkle Root)
             const settlements = await this.betService.getSettlementsForRound(round.id);
             if (settlements.length > 0) {
                const root = this.merkleService.generateRoot(settlements);
                await this.strategyBService.publishRoot(round.id, root, settlements.length);
             }

             // 3. Complete Round
             await this.roundService.completeRound(round.id, closePrice);
             this.metricsService.increment('settlementCount');
             this.metricsService.recordSettlementLatency(Date.now() - settlementStart);
             
             this.eventBus.publish('ROUND_SETTLED', { round, closePrice, snapshot });
          }
        }
      }
    }
  }
}
