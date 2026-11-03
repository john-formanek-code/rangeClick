# Backend endpoint catalog

High-level API surface in `apps/backend/src/index.ts`:

- `GET /ping`: liveness check.
- `GET /metrics`: expose aggregated counters/latencies from `metrics.service.ts`.
- `GET /rules`: publishes house edge, oracle sources, threshold windows for transparency.
- `POST /auth/login`: persistent username login + wallet creation via `UserService` and `LedgerService`.
- `GET /wallet/:userId` + `POST /wallet/deposit`: canonical wallet reads + deposits that create ledger entries.
- `POST /bets/place`, `GET /bets/active`, `GET /bets/history`: bet lifecycle, enforcing rate limits, limits, and cutoff logic.
- `GET /rounds`, `GET /rounds/active`, `GET /rounds/:id/tiles`, `/rounds/:id/audit`, `/rounds/:id/proof`: round discovery, tile lookup, audit data, and Merkle proof retrieval.
- `GET /settings/:userId` + `POST /settings`: responsible play configuration.
- `GET /admin/reconcile`: admin hook to trigger reconciliation across wallets (should run in maintenance window).

This catalog keeps the API contract explicit for new client work or docs.
