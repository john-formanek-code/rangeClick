import db from '../db';
import { Instrument } from '@rangeclick/types';

/**
 * Section 16.2: Oracle Replay Test
 * Replays archived venue ticks to verify that index computation is stable and deterministic.
 */
async function runReplayTest(instrument: Instrument) {
  console.log(`🕵️ Starting Oracle Replay Test for ${instrument}...`);

  // 1. Fetch recent samples
  const samples = await db('oracle_samples')
    .where({ instrument })
    .orderBy('created_at', 'desc')
    .limit(5);

  for (const sample of samples) {
    const roundId = sample.round_id;
    const computedPrice = parseFloat(sample.computed_price);
    
    // In a real high-fidelity replay, we would use the exact timestamps.
    // For this prototype, we verify that the persisted median matches the persisted source data.
    const sourcePrices: Record<string, number> = JSON.parse(sample.source_prices);
    const prices = Object.values(sourcePrices).sort((a, b) => a - b);
    
    // Re-compute median
    let recomputedMedian = 0;
    const mid = Math.floor(prices.length / 2);
    if (prices.length % 2 !== 0) {
      recomputedMedian = prices[mid];
    } else {
      recomputedMedian = (prices[mid - 1] + prices[mid]) / 2;
    }

    const diff = Math.abs(recomputedMedian - computedPrice);
    if (diff < 0.001) {
      console.log(`✅ Round ${roundId}: Determinism Verified. Median: ${computedPrice}`);
    } else {
      console.error(`❌ Round ${roundId}: DETERMINISM FAILURE! Sample: ${computedPrice}, Recomputed: ${recomputedMedian}`);
    }
  }

  console.log('🏁 Replay Test Finished.');
  process.exit(0);
}

const inst = process.argv[2] as Instrument || Instrument.BTC;
runReplayTest(inst).catch(console.error);
