# Oracle sampling rules

Key guardrails the backend should maintain:

- Sample from at least Binance, Coinbase, and Kraken feeds; prefer median/trimmed mean when all are healthy.
- If fewer than `minSources = 2` respond within ±500ms of expiry, freeze betting and trigger a reconciliation workflow.
- Cache per-round anchor data: feed prices, computed `closePrice`, sampling timestamp, and fallback notes.
- Persist a Merkle anchor (`settlement_anchors`) once all bets settle so `/rounds/:id/proof` can respond deterministically.

Documenting these here will make future audits or transparency reporting easier.
