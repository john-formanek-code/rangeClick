# Architecture overview

Breadth-first summary of the RangeClick system:

- `apps/backend`: fastify/knex service that owns the authoritative ledger, rounds, oracle sampling, and settlement loop.
- `apps/web`: Vite/React experience that subscribes to live rounds, renders tiles, and posts bet actions via the backend API.
- `packages/types`: shared TypeScript domain contracts (instruments, rounds, bets, ledgers, websocket message types).

Key invariants:

1. Authoritative time + price sampling live in backend services; clients only render.
2. Wallet balance is derived from immutable ledger entries (`balance = credits − debits`).
3. Settlement is deterministic based on `(closePrice, tileBounds, expiry)`.

This note exists to keep architectural decisions visible before splitting more granular implementation work.
