import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';
import { Instrument } from '@rangeclick/types';

// Services
import db from './db';
import { EventBus, globalEventBus } from './services/event.bus';
import { SimulatedPriceFeed } from './services/feeds/simulated.feed';
import { MarketService } from './services/market.service';
import { RoundService } from './services/round.service';
import { LedgerService } from './services/ledger.service';
import { BetService } from './services/bet.service';
import { GameLoop } from './services/game.loop';
import { Gateway } from './services/gateway';
import { UserService } from './services/user.service';
import { MerkleService } from './services/merkle.service';
import { SecurityService } from './services/security.service';
import { ReconciliationService } from './services/reconciliation.service';
import { globalMetrics } from './services/metrics.service';
import { StrategyBService } from './services/strategy-b.service';

// App Setup
const server = fastify({ logger: true });

server.register(cors, { origin: '*' });
server.register(fastifyWebsocket);

// Service Instantiation
const eventBus = globalEventBus;
const metricsService = globalMetrics;
const strategyBService = new StrategyBService(db);
const marketService = new MarketService(db, eventBus, [
  new SimulatedPriceFeed('Binance', { [Instrument.BTC]: 30000, [Instrument.ETH]: 2000 }),
  new SimulatedPriceFeed('Coinbase', { [Instrument.BTC]: 30005, [Instrument.ETH]: 2002 }),
  new SimulatedPriceFeed('Kraken', { [Instrument.BTC]: 29995, [Instrument.ETH]: 1998 })
]);
const roundService = new RoundService(db);
const ledgerService = new LedgerService(db);
const userService = new UserService(db);
const securityService = new SecurityService(db);
const reconciliationService = new ReconciliationService(db);
const betService = new BetService(db, ledgerService, roundService, securityService, metricsService, marketService, eventBus);
const gameLoop = new GameLoop(db, roundService, marketService, betService, ledgerService, metricsService, reconciliationService, securityService, strategyBService, eventBus);
const gateway = new Gateway(eventBus, metricsService);

// Middleware: Correlation ID (Section 15.4)
server.addHook('onRequest', async (request, reply) => {
  // Global IP Rate Limit (Section 10.1)
  if (securityService.isIpRateLimited(request.ip)) {
    return reply.status(429).send({ error: 'Too many requests' });
  }

  const correlationId = request.headers['x-correlation-id'] || uuidv4();
  (request as any).correlationId = correlationId;
  reply.header('x-correlation-id', correlationId);
});

// WebSocket Endpoint
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    gateway.register(connection.socket);
  });
});

// REST API
server.get('/ping', async () => ({ status: 'ok', time: Date.now() }));

// New: Metrics Endpoint
server.get('/metrics', async () => {
  return metricsService.getMetrics();
});

// New: Admin Reconciliation
server.get('/admin/reconcile', async () => {
  return reconciliationService.reconcileAllWallets();
});

// New: Get Game Rules
server.get('/rules', async () => {
  return {
    houseEdge: 0.05,
    oracle: 'Median of Binance, Coinbase, Kraken',
    stalenessTolerance: '500ms',
    minSources: 2,
    cutoffWindow: {
      '60': '5000ms',
      '30': '3000ms'
    }
  };
});

// 1. Persistent Login via Username
server.post('/auth/login', async (req, reply) => {
  const { username } = req.body as { username: string };
  if (!username) return reply.status(400).send({ error: 'Username required' });
  
  const user = await userService.findOrCreateUser(username);
  const wallet = await ledgerService.ensureWallet(user.id);
  
  return { userId: user.id, username: user.username, wallet };
});

// New: Get Wallet Balance (Authoritative)
server.get('/wallet/:userId', async (req, reply) => {
  const { userId } = req.params as { userId: string };
  const wallet = await ledgerService.getWallet(userId);
  if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });
  return wallet;
});

// New: Deposit Funds
server.post('/wallet/deposit', async (req, reply) => {
  const { userId, amount } = req.body as { userId: string, amount: number };
  if (!userId || !amount) return reply.status(400).send({ error: 'UserId and amount required' });
  
  const wallet = await ledgerService.getWallet(userId);
  if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

  await db.transaction(async (trx) => {
    await ledgerService.createEntry(trx, {
      userId,
      walletId: wallet.id,
      type: 'DEPOSIT' as any,
      amount,
      currency: 'USD',
      refType: 'TRANSACTION',
      refId: uuidv4()
    });
  });

  return ledgerService.getWallet(userId);
});

// 2. Place Bet
server.post('/bets/place', async (req, reply) => {
  const body = req.body as any;
  try {
    const bet = await betService.placeBet({
      userId: body.userId,
      roundId: body.roundId,
      tileId: body.tileId,
      amount: body.amount,
      tile: body.tile,
      multiplier: body.multiplier,
      idempotencyKey: body.idempotencyKey
    });
    return bet;
  } catch (err: any) {
    reply.status(400).send({ error: err.message });
  }
});

server.get('/bets/active', async (req) => {
    const { userId } = req.query as { userId: string };
    if (!userId) throw new Error('UserId required');
    return betService.getActiveBets(userId);
});

server.get('/bets/history', async (req) => {
    const { userId } = req.query as { userId: string };
    if (!userId) throw new Error('UserId required');
    return betService.getBetHistory(userId);
});

// New: Dedicated Active Rounds endpoint
server.get('/rounds/active', async (req) => {
  const { instrument, tf } = req.query as any;
  return roundService.getActiveRounds(instrument || 'BTC', tf ? Number(tf) : undefined);
});

// 3. Get Active Rounds (General)
server.get('/rounds', async (req) => {
  const { instrument, tf } = req.query as any;
  return roundService.getActiveRounds(instrument || 'BTC', tf ? Number(tf) : undefined);
});

server.get('/rounds/:id/tiles', async (req) => {
  const { id } = req.params as { id: string };
  return roundService.getTilesForRound(id);
});

server.get('/rounds/:id/audit', async (req) => {
  const { id } = req.params as { id: string };
  return roundService.getRoundAudit(id);
});

// New: Get Settlement Proof (Merkle Path)
server.get('/rounds/:id/proof', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { betId } = req.query as { betId: string };
  
  const anchor = await db('settlement_anchors').where({ round_id: id }).first();
  if (!anchor) return reply.status(404).send({ error: 'Anchor not found' });

  const settlements = await betService.getSettlementsForRound(id);
  const merkleService = new MerkleService();
  const proof = merkleService.getProof(settlements, betId);
  
  return {
    root: anchor.merkle_root,
    proof,
    betId,
    txHash: anchor.batch_tx_hash
  };
});

// New: User Settings (Responsible Gambling Limits)
server.get('/settings/:userId', async (req) => {
  const { userId } = req.params as { userId: string };
  const limits = await db('user_limits').where({ user_id: userId }).first();
  return limits || { max_bet_amount: 1000, max_bets_per_round: 10 };
});

server.post('/settings', async (req) => {
  const { userId, maxBetAmount, maxBetsPerRound } = req.body as any;
  await db('user_limits')
    .insert({ user_id: userId, max_bet_amount: maxBetAmount, max_bets_per_round: maxBetsPerRound, updated_at: db.fn.now() })
    .onConflict('user_id')
    .merge();
  return { status: 'ok' };
});

// Start Function
const start = async () => {
  try {
    // 1. Run Migrations (for MVP convenience)
    console.log('Running migrations...');
    await db.migrate.latest();

    // 2. Start Services
    await marketService.start();
    gameLoop.start();
    gateway.start();

    // 3. Start Server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 1605;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
