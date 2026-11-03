# Data model snapshot

Important persisted tables (from earliest migrations + later tweaks):

- `users`: UUID primary key, unique username, created timestamp. Drives wallet + bet ownership.
- `wallets`: One per user/currency pair, enforces unique `(user_id, currency)`; ledger ensures derived balance stays consistent.
- `ledger_entries`: Governs every movement (deposit, bet, win, refund). Fields include `reference_type` and `balance_after` so the frontend can trust the wallet API.
- `rounds`: Candle-aligned per-instrument rows; status transitions `OPEN → CUTOFF → SETTLED/REFUNDED`, stores cutoff/expiry timestamps, `oracle_close`, and audit `oracle_meta`.
- `bets`: Stores tile bounds, multiplier, amount, payout, idempotency keys (added via later migration), and status (PLACED/WON/LOST/REFUNDED).
- `tiles` + `settlement_anchors` + `abuse_events`: Added later to support grid lookup, Merkle proofs, and compliance monitoring.

Referencing this note helps onboard new engineers to DB expectations when touching migrations or ledger logic.
