import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export class RateLimiter {
  private attempts: Record<string, number[]> = {};

  isLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    if (!this.attempts[key]) {
      this.attempts[key] = [];
    }

    this.attempts[key] = this.attempts[key].filter(ts => now - ts < windowMs);

    if (this.attempts[key].length >= limit) {
      return true;
    }

    this.attempts[key].push(now);
    return false;
  }
}

export class SecurityService {
  private ipRateLimiter = new RateLimiter();

  constructor(private knex: Knex) {}

  isIpRateLimited(ip: string): boolean {
    // Disable IP rate limiting in non-production environments to avoid throttling the UI's burst requests.
    if (process.env.NODE_ENV !== 'production') return false;
    // Section 10.1: IP rate limit - 20 requests per 1s
    return this.ipRateLimiter.isLimited(ip, 20, 1000);
  }

  async logAbuseEvent(params: {
    userId?: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    metadata: any;
  }) {
    await this.knex('abuse_events').insert({
      id: uuidv4(),
      user_id: params.userId,
      type: params.type,
      severity: params.severity,
      metadata: JSON.stringify(params.metadata)
    });
    console.warn(`🚨 Abuse Event Logged: ${params.type} for ${params.userId || 'system'}`);
  }

  /**
   * Simple anomaly detection: Check if user win rate is significantly above average
   */
  async detectWinRateAnomaly(userId: string): Promise<boolean> {
    const stats = await this.knex('bets')
      .where({ user_id: userId })
      .whereNot({ status: 'PLACED' })
      .select(
        this.knex.raw('count(*) as total'),
        this.knex.raw("sum(case when status = 'WON' then 1 else 0 end) as wins")
      )
      .first();

    if (!stats || stats.total < 20) return false;

    const winRate = stats.wins / stats.total;
    if (winRate > 0.75) { // Threshold for anomaly (75% win rate over 20+ bets is suspicious)
      await this.logAbuseEvent({
        userId,
        type: 'ANOMALY_WINRATE',
        severity: 'MEDIUM',
        metadata: { winRate, total: stats.total }
      });
      return true;
    }
    return false;
  }
}
