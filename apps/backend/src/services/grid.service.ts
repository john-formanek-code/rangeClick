import { Instrument, Tile } from '@rangeclick/types';
import { v4 as uuidv4 } from 'uuid';

export class GridService {
  generateTilesForPrice(
    round_id: string,
    instrument: Instrument,
    currentPrice: number,
    history: { p: number, ts: number }[],
    timeHorizonMs: number = 300_000
  ): any[] {
    // 1. Calculate Volatility (Std Dev), scaled to how far out this round settles.
    // History only covers the last ~20s of ticks, so measuring stdDev of raw price
    // levels over that window and using it to price a 5-minute (or longer) round
    // massively underestimates how far the price can actually move by settlement.
    const stdDev = this.estimateVolatility(instrument, history, timeHorizonMs);

    // 2. Adjust Step based on Volatility (Section 6.2)
    // Higher volatility -> larger tiles
    const step = Math.max(parseFloat((stdDev * 0.6).toFixed(2)), instrument === Instrument.BTC ? 2 : 0.1);
    
    const base = Math.floor(currentPrice / step) * step;

    /**
     * 3. Dynamic Probability Calculation (Gaussian Approximation)
     * We assume a normal distribution around currentPrice with stdDev.
     * We calculate the probability of landing in each [min, max] range.
     */
    const edge = 0.05; // 5% house edge
    // 9 vertical tiles (height)
    const configurations = [
      { offset: 4 },
      { offset: 3 },
      { offset: 2 },
      { offset: 1 },
      { offset: 0 },
      { offset: -1 },
      { offset: -2 },
      { offset: -3 },
      { offset: -4 },
    ];

    return configurations.map(config => {
      const min_price = parseFloat((base + (config.offset * step)).toFixed(2));
      const max_price = parseFloat((min_price + step).toFixed(2));
      
      // Calculate probability p using CDF of normal distribution
      // p = P(X < max) - P(X < min)
      const p = this.calculateNormalProb(min_price, max_price, currentPrice, stdDev);
      
      // Multiplier m = (1 - edge) / p
      // Clamp p to avoid infinite multipliers
      const clampedP = Math.max(0.01, Math.min(0.95, p));
      const multiplier = parseFloat(((1 - edge) / clampedP).toFixed(2));

      return {
        id: uuidv4(),
        round_id,
        min_price,
        max_price,
        multiplier: Math.min(50, multiplier), // Clamp max multiplier to 50x
        probability: clampedP
      };
    });
  }

  /**
   * Approximate Cumulative Distribution Function (CDF) for Normal Distribution
   */
  private normalCDF(x: number, mean: number, stdDev: number): number {
    const z = (x - mean) / stdDev;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302745))));
    if (z > 0) return 1 - p;
    return p;
  }

  private calculateNormalProb(min: number, max: number, mean: number, stdDev: number): number {
    return this.normalCDF(max, mean, stdDev) - this.normalCDF(min, mean, stdDev);
  }

  /**
   * Estimate the stdDev of price movement over `timeHorizonMs`, not just over the
   * short history window. Random-walk price movement scales with sqrt(time), so we
   * measure the per-tick return volatility and scale it up to the round's horizon
   * instead of using the raw (short-window) price level stdDev directly.
   */
  private estimateVolatility(instrument: Instrument, history: { p: number, ts: number }[], timeHorizonMs: number): number {
    // Minimum sane spread over a ~5min horizon, used as a floor and as the fallback
    // when there isn't enough history yet to estimate real volatility.
    const floorPerHorizon = instrument === Instrument.BTC ? 15 : 1.5;
    const floor = floorPerHorizon * Math.sqrt(Math.max(timeHorizonMs, 1) / 300_000);

    if (history.length < 3) return floor;

    const returns: number[] = [];
    const intervals: number[] = [];
    for (let i = 1; i < history.length; i++) {
      returns.push(history[i].p - history[i - 1].p);
      intervals.push(history[i].ts - history[i - 1].ts);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
    const perTickStdDev = Math.sqrt(variance);

    const avgTickMs = Math.max(1, intervals.reduce((a, b) => a + b, 0) / intervals.length);
    const ticksInHorizon = Math.max(1, timeHorizonMs / avgTickMs);
    const scaledStdDev = perTickStdDev * Math.sqrt(ticksInHorizon);

    return Math.max(scaledStdDev, floor);
  }
}
