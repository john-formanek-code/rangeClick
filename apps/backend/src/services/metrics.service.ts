export class MetricsService {
  private metrics: any = {
    betPlacementCount: 0,
    settlementCount: 0,
    activeConnections: 0,
    errors: 0,
    startTime: Date.now()
  };

  private placementLatencies: number[] = [];
  private settlementLatencies: number[] = [];

  increment(key: string) {
    if (this.metrics[key] !== undefined) {
      this.metrics[key]++;
    }
  }

  set(key: string, value: number) {
    this.metrics[key] = value;
  }

  recordPlacementLatency(ms: number) {
    this.placementLatencies.push(ms);
    if (this.placementLatencies.length > 1000) this.placementLatencies.shift();
  }

  recordSettlementLatency(ms: number) {
    this.settlementLatencies.push(ms);
    if (this.settlementLatencies.length > 1000) this.settlementLatencies.shift();
  }

  private calculatePercentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      latency_slos: {
        placement: {
          p95: this.calculatePercentile(this.placementLatencies, 95),
          p99: this.calculatePercentile(this.placementLatencies, 99)
        },
        settlement: {
          p95: this.calculatePercentile(this.settlementLatencies, 95),
          p99: this.calculatePercentile(this.settlementLatencies, 99)
        }
      }
    };
  }
}

export const globalMetrics = new MetricsService();
