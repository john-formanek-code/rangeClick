import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:1605';
const CONCURRENT_USERS = 50;

async function simulateUser(id: number) {
  const username = `load_user_${id}_${Date.now()}`;
  
  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const auth = await loginRes.json() as any;

  // 2. Get Rounds
  const roundsRes = await fetch(`${BASE_URL}/rounds?instrument=BTC`);
  const rounds = await roundsRes.json() as any[];
  const round = rounds[0];

  // 3. Get Tiles
  const tilesRes = await fetch(`${BASE_URL}/rounds/${round.id}/tiles`);
  const tiles = await tilesRes.json() as any[];
  const tile = tiles[Math.floor(Math.random() * tiles.length)];

  // 4. Place Bet
  const start = Date.now();
  const betRes = await fetch(`${BASE_URL}/bets/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: auth.userId,
      roundId: round.id,
      tileId: tile.id,
      amount: 5,
      tile: { min: tile.min_price, max: tile.max_price },
      multiplier: tile.multiplier,
      idempotencyKey: uuidv4()
    })
  });
  const latency = Date.now() - start;
  
  if (betRes.ok) {
    return { success: true, latency };
  } else {
    const err = await betRes.json() as any;
    return { success: false, error: err.error, latency };
  }
}

async function runLoadTest() {
  console.log(`🚀 Starting Load Test with ${CONCURRENT_USERS} concurrent users...`);
  const start = Date.now();

  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(simulateUser(i));
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;

  const successCount = results.filter(r => r.success).length;
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];

  console.log(`
📊 Load Test Results:`);
  console.log(`- Total Users: ${CONCURRENT_USERS}`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Failures: ${CONCURRENT_USERS - successCount}`);
  console.log(`- P95 Latency: ${p95}ms`);
  console.log(`- Total Throughput Time: ${totalTime}ms`);

  if (p95 > 400) {
    console.warn('⚠️ Warning: P95 latency exceeds SLO target of 400ms');
  } else {
    console.log('✅ Latency SLO Target Met!');
  }

  process.exit(0);
}

runLoadTest().catch(console.error);
