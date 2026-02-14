import { Instrument } from '@rangeclick/types';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:1605';

async function runTest() {
  console.log('🧪 Starting Integration Test...');

  // 1. Login
  const username = `testuser_${Date.now()}`;
  console.log(`Step 1: Login as ${username}`);
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const auth = await loginRes.json() as any;
  console.log('User:', auth);

  // 2. Get Active Rounds
  console.log('Step 2: Get Rounds');
  const roundsRes = await fetch(`${BASE_URL}/rounds?instrument=BTC`);
  const rounds = await roundsRes.json() as any[];
  const round = rounds[0];
  console.log('Active Round:', round.id);

  // 3. Get Tiles
  console.log('Step 3: Get Tiles');
  const tilesRes = await fetch(`${BASE_URL}/rounds/${round.id}/tiles`);
  const tiles = await tilesRes.json() as any[];
  const tile = tiles[2]; // Mid-Up
  console.log('Selected Tile:', tile.id, tile.min_price, '-', tile.max_price);

  // 4. Place Bet
  console.log('Step 4: Place Bet');
  const betRes = await fetch(`${BASE_URL}/bets/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: auth.userId,
      roundId: round.id,
      tileId: tile.id,
      amount: 10,
      tile: { min: tile.min_price, max: tile.max_price },
      multiplier: tile.multiplier,
      idempotencyKey: uuidv4()
    })
  });
  const bet = await betRes.json() as any;
  console.log('Full Bet Response:', bet);
  console.log('Bet Placed:', bet.id, bet.status);

  // 5. Verify Active Bets
  console.log('Step 5: Verify Active Bets');
  const activeRes = await fetch(`${BASE_URL}/bets/active?userId=${auth.userId}`);
  const activeBets = await activeRes.json() as any[];
  console.log('Active Bets Count:', activeBets.length);

  if (activeBets.length !== 1) throw new Error('Bet not found in active list');

  console.log('✅ Integration Test Passed!');
}

runTest().catch(console.error);
