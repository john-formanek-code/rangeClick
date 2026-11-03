import { Instrument, type Round, type Bet } from '@rangeclick/types';

const BASE_URL = 'http://localhost:1605';

export const api = {
  async login(username: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return res.json();
  },

  async getRounds(instrument: Instrument): Promise<Round[]> {
    const res = await fetch(`${BASE_URL}/rounds?instrument=${instrument}&tf=300`);
    return res.json();
  },

  async getActiveRounds(instrument: Instrument): Promise<Round[]> {
    const res = await fetch(`${BASE_URL}/rounds/active?instrument=${instrument}&tf=300`);
    return res.json();
  },

  async getTiles(roundId: string): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/rounds/${roundId}/tiles`);
    return res.json();
  },

  async getActiveBets(userId: string): Promise<Bet[]> {
    const res = await fetch(`${BASE_URL}/bets/active?userId=${userId}`);
    return res.json();
  },

  async getBetHistory(userId: string): Promise<Bet[]> {
      const res = await fetch(`${BASE_URL}/bets/history?userId=${userId}`);
      return res.json();
  },

  async getAudit(roundId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/rounds/${roundId}/audit`);
    return res.json();
  },

  async getProof(roundId: string, betId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/rounds/${roundId}/proof?betId=${betId}`);
    return res.json();
  },

  async getSettings(userId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/settings/${userId}`);
    return res.json();
  },

  async updateSettings(params: { userId: string, maxBetAmount: number, maxBetsPerRound: number }): Promise<any> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async deposit(userId: string, amount: number): Promise<any> {
    const res = await fetch(`${BASE_URL}/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount })
    });
    return res.json();
  },

  async placeBet(params: {
    userId: string;
    roundId: string;
    tileId: string;
    amount: number;
    tile: { min: number; max: number };
    multiplier: number;
    idempotencyKey?: string;
  }): Promise<Bet> {
    const res = await fetch(`${BASE_URL}/bets/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to place bet');
    }
    return res.json();
  }
};
