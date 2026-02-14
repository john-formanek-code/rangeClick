import { Instrument, MarketTick } from '@rangeclick/types';
import { EventBus } from './event.bus';
import { PriceFeed } from './feeds/simulated.feed';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export class MarketService {
  private sourcePrices: Record<string, Record<string, number>> = {};
  private priceHistory: Record<string, { p: number, ts: number }[]> = {};
  private tickQueue: any[] = [];
  
  private currentIndices: Record<Instrument, number> = {
    [Instrument.BTC]: 0,
    [Instrument.ETH]: 0
  };

  constructor(
    private knex: Knex,
    private eventBus: EventBus,
    private feeds: PriceFeed[]
  ) {
    // Background worker for batched archival (Section 5.3 hardening)
    setInterval(() => this.flushTickQueue(), 5000);
  }

  async start() {
    console.log('🚀 Market Service Starting with Multi-Source Aggregation...');
    for (const feed of this.feeds) {
      await feed.connect();
      Object.values(Instrument).forEach(instrument => {
        feed.subscribe(instrument as Instrument, (tick) => this.handleTick(tick));
      });
    }
  }

  private async handleTick(tick: MarketTick) {
    if (!this.sourcePrices[tick.instrument]) {
      this.sourcePrices[tick.instrument] = {};
      this.priceHistory[tick.instrument] = [];
    }
    
    // 0. Queue Raw Tick for batched archival
    this.tickQueue.push({
      id: uuidv4(),
      instrument: tick.instrument,
      source: tick.source,
      price: tick.price,
      timestamp: tick.timestamp
    });

    // 1. Update source price
    this.sourcePrices[tick.instrument][tick.source] = tick.price;
    
    // 2. Compute Median
    const prices = Object.values(this.sourcePrices[tick.instrument]).sort((a, b) => a - b);
    const median = this.computeMedian(prices);
    this.currentIndices[tick.instrument] = median;

    // 3. Update History
    this.priceHistory[tick.instrument].push({ p: median, ts: tick.timestamp });
    if (this.priceHistory[tick.instrument].length > 100) {
      this.priceHistory[tick.instrument].shift();
    }

    this.eventBus.publish('PRICE_UPDATE', {
      instrument: tick.instrument,
      price: median,
      timestamp: tick.timestamp,
      sourceCount: prices.length
    });
  }

  private async flushTickQueue() {
    if (this.tickQueue.length === 0) return;
    const batch = [...this.tickQueue];
    this.tickQueue = [];
    
    try {
      await this.knex('oracle_ticks').insert(batch);
      // console.log(`📦 Archived ${batch.length} ticks`);
    } catch (err) {
      console.error('Failed to flush tick queue', err);
    }
  }

  getHistory(instrument: Instrument): number[] {
    return (this.priceHistory[instrument] || []).map(h => h.p);
  }

  getInterpolatedPrice(instrument: Instrument, targetTs: number): { price: number, decision: string } {
    const history = this.priceHistory[instrument] || [];
    if (history.length < 2) return { price: this.getCurrentPrice(instrument), decision: 'MEDIAN' };
    const rightIdx = history.findIndex(h => h.ts >= targetTs);
    if (rightIdx === -1 || rightIdx === 0) return { price: this.getCurrentPrice(instrument), decision: 'MEDIAN' };
    const left = history[rightIdx - 1];
    const right = history[rightIdx];
    const price = left.p + (targetTs - left.ts) * (right.p - left.p) / (right.ts - left.ts);
    return { price: parseFloat(price.toFixed(2)), decision: 'INTERPOLATED' };
  }

  getHealthySourceCount(instrument: Instrument): number {
    return Object.keys(this.sourcePrices[instrument] || {}).length;
  }

  private computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    if (values.length % 2 !== 0) return values[mid];
    return (values[mid - 1] + values[mid]) / 2;
  }

  getCurrentPrice(instrument: Instrument): number {
    return this.currentIndices[instrument];
  }

  getPriceSnapshot(instrument: Instrument) {
    const sources = this.sourcePrices[instrument] || {};
    return {
      computedPrice: this.currentIndices[instrument],
      sources: { ...sources },
      sourceCount: Object.keys(sources).length
    };
  }
}
