import { Instrument, MarketTick } from '@rangeclick/types';

export interface PriceFeed {
  connect(): Promise<void>;
  subscribe(instrument: Instrument, callback: (tick: MarketTick) => void): void;
}

export class SimulatedPriceFeed implements PriceFeed {
  private intervals: NodeJS.Timeout[] = [];
  private prices: Record<Instrument, number>;

  constructor(
    private sourceName: string,
    initialPrices: Record<Instrument, number> = { [Instrument.BTC]: 30000, [Instrument.ETH]: 2000 }
  ) {
    this.prices = { ...initialPrices };
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connected to ${this.sourceName}`);
  }

  subscribe(instrument: Instrument, callback: (tick: MarketTick) => void): void {
    const interval = setInterval(() => {
      // Random walk simulation with slight drift per source
      const volatility = instrument === Instrument.BTC ? 5 : 0.5;
      const change = (Math.random() - 0.5) * volatility;
      this.prices[instrument] += change;
      
      const tick: MarketTick = {
        instrument,
        price: parseFloat(this.prices[instrument].toFixed(2)),
        timestamp: Date.now(),
        source: this.sourceName
      };

      callback(tick);
    }, 200 + Math.random() * 100); // Randomize interval slightly

    this.intervals.push(interval);
  }
}
