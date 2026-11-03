# Metrics to track

From `metrics.service.ts` implict needs:

- `betPlacementCount`: total bets (incremented on every placement) to monitor throughput.
- `placementLatency`: record placement latency for SLO compliance (p95 < 200ms, p99 < 400ms).
- `settlementDuration`: time between expiry and flush (target p95 < 300ms).
- `sourceHealth`: number of healthy oracle feeds; the frontend uses this to show “Market halted”.

Recording these in a note makes it easier to wire dashboards later and to keep SLO targets inline with product goals.
