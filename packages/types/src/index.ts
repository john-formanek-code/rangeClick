// Core Domain Entities for RangeClick

export enum Instrument {
  BTC = 'BTC',
  ETH = 'ETH'
}

export enum TimeFrame {
  TF_30S = 30,
  TF_60S = 60
}

export enum RoundStatus {
  OPEN = 'OPEN',
  CUTOFF = 'CUTOFF',
  SETTLING = 'SETTLING',
  DELAYED = 'DELAYED',
  SETTLED = 'SETTLED',
  REFUNDED = 'REFUNDED'
}

export interface MarketTick {
  instrument: Instrument;
  price: number;
  timestamp: number; // Unix ms
  source: string;
}

export interface Round {
  id: string; // e.g., "BTC-60-1730000060"
  instrument: Instrument;
  tf: TimeFrame;
  expiry_ts: number; // Unix ms
  cutoff_ts: number; // Unix ms
  status: RoundStatus;
  oracleClose: number | null;
  settledAt: number | null;
}

export interface Tile {
  id: string;
  roundId: string;
  minPrice: number; // Inclusive
  maxPrice: number; // Exclusive
  multiplier: number;
  probability: number; // Calculated win probability
}

export enum BetStatus {
  PLACED = 'PLACED',
  WON = 'WON',
  LOST = 'LOST',
  REFUNDED = 'REFUNDED'
}

export interface Bet {
  id: string; // UUID
  userId: string;
  roundId: string;
  tileId: string; // or define bounds explicitly if dynamic
  amount: number;
  multiplier: number; // Locked at placement
  status: BetStatus;
  payout: number;
  createdAt: number;
}

export enum LedgerEntryType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET_PLACED = 'BET_PLACED',
  BET_WIN = 'BET_WIN',
  REFUND = 'REFUND'
}

export interface LedgerEntry {
  id: string; // UUID
  userId: string;
  type: LedgerEntryType;
  amount: number; // Positive for credit, negative for debit
  currency: string; // 'USD' or 'USDC'
  referenceId: string; // bet_id, tx_id
  referenceType: 'BET' | 'TRANSACTION' | 'ROUND';
  balanceAfter: number;
  createdAt: number;
}

// WebSocket Message Types
export enum WsMessageType {
  PRICE_TICK = 'PRICE_TICK',
  ROUND_STATE = 'ROUND_STATE',
  GRID_UPDATE = 'GRID_UPDATE',
  BET_ACK = 'BET_ACK',
  SETTLEMENT = 'SETTLEMENT',
  WALLET_UPDATE = 'WALLET_UPDATE',
  TIME_SYNC = 'TIME_SYNC',
  AUTHENTICATE = 'AUTHENTICATE',
  ERROR = 'ERROR'
}

export interface WsMessage<T = any> {
  type: WsMessageType;
  payload: T;
}
