# RangeClick — Developer Implementation Guide (Architecture + Options)
**Audience:** Senior engineering / technical leadership  
**Goal:** Provide cohesive, implementation‑ready approach options (MVP → scalable), with clear tradeoffs for latency, integrity, and auditability.

---

## 0) The core technical truth
This product is a **real‑time settlement engine** disguised as a game UI.

Three things must be **correct and fast**:
1. **Authoritative time** (server time wins; clients lie or drift)
2. **Authoritative price** (oracle/index definition + reproducible sampling)
3. **Authoritative accounting** (ledger that never breaks)

If any of these three are fuzzy, users will call “rigged” — and they won’t be wrong.

---

## 1) Key technical requirements (non‑negotiables)
### 1.1 Latency SLOs (recommended targets)
- Bet placement ACK: **p95 < 200 ms**, **p99 < 400 ms**
- Realtime price push (index): **p95 < 250 ms**
- Settlement publish: **p95 < 300 ms** after expiry

### 1.2 Determinism & idempotency
- Bet outcome must be deterministic given: `(oracle_close, tile_bounds, expiry_ts)`
- Settlement must be **idempotent** (safe to retry without double‑credit)
- Every wallet movement must be represented by an immutable **ledger entry**

### 1.3 Fairness controls
- Enforce a **cutoff window** before expiry (server‑time enforced)
- Lock multiplier and tile bounds at placement
- Prevent “last‑ms sniping” and latency arbitrage

---

## 2) Conceptual system model
### 2.1 Core domain entities
- **Instrument:** BTC, ETH
- **Round:** a discrete time window (if candle‑aligned) with an expiry timestamp
- **Tile:** price interval `[L, U)` (deterministically generated or stored)
- **Bet:** user’s selection of tile + stake + locked multiplier + expiry
- **Oracle sample:** venue prices and computed index at sampling time
- **Settlement:** outcome + payout for each bet
- **Ledger entry:** append‑only accounting events

### 2.2 Critical invariants
- A bet is either `PLACED -> SETTLED` or `PLACED -> REFUNDED`
- Wallet balance is derivable from ledger sum (credits − debits)
- A settlement uses exactly **one** oracle close value per round/expiry

---

## 3) Implementation strategies (choose your flavor)
There are three viable approaches. Pick based on how “instant” you want UX vs how “trustless” you want infra.

### Strategy A — Pure Web2 (fastest MVP, best latency)
**Summary:** Everything off‑chain; use deterministic index oracle + audit logs; optional transparency via public reports.

**Pros**
- Lowest latency, best UX, simplest engineering
- Easier to scale realtime with standard infra

**Cons**
- User trust depends on your reputation + transparency
- “Rigged” accusations require strong audit tooling

**Use when**
- You need to validate retention/revenue fast
- You will ship robust oracle/audit logs early

### Strategy B — Hybrid audit anchoring (best balance)
**Summary:** Off‑chain execution for speed; periodically publish **Merkle root** of settlements to a public chain (or transparency log) to prove non‑tampering.

**Pros**
- Near‑Web2 latency + cryptographic integrity anchor
- Strong defense against retroactive edits

**Cons**
- Additional complexity (batching, Merkle proofs, publishing)
- Doesn’t make it “non‑custodial” by itself

**Use when**
- You want speed *and* verifiable integrity
- You anticipate adversarial users and reputational attacks

### Strategy C — Fully on‑chain execution (most trustless, worst UX)
**Summary:** Bets and settlement executed on chain (L2). Oracle writes close on chain; contracts settle.

**Pros**
- Highest transparency and verifiability

**Cons**
- UX friction: gas, wallets, chain latency
- Realtime gameplay loop suffers
- Oracle + MEV considerations become brutal

**Use when**
- The product is explicitly a crypto‑native, on‑chain casino
- You accept slower rounds and higher friction

**Developer recommendation:** Build **Strategy A** MVP and architect cleanly so you can upgrade to **Strategy B** without rewrite.

---

## 4) Round timing model (developer viewpoint)
Two models: **rolling expiry** vs **candle‑aligned**.

### 4.1 Candle‑aligned rounds (recommended)
- For TF=60s: rounds end at each minute boundary (UTC)
- Benefits:
  - Easy batching and settlement triggers
  - Clear UX: “Round ends in 7s”
- Complexity:
  - Must enforce cutoff window to prevent sniping

### 4.2 Rolling expiry
- Each bet expires exactly TF after placement
- Benefits:
  - Always available, arcade‑like
- Complexity:
  - Many independent expiries → more timers, more load
  - Settlement batching harder

**Recommendation:** Candle‑aligned for MVP.

---

## 5) Oracle / index price implementation (the hardest part)
### 5.1 Feed ingestion
- Maintain WebSocket connections to multiple exchanges
- Normalize updates into a common schema:
  - timestamp (server receive time + venue event time if available)
  - last price / mid price
  - status flags (stale, missing)

### 5.2 Index computation (deterministic)
Compute index at time `T` from available venue prices:
- Use **median** (robust to outliers) or **trimmed mean**
- Example:
  - take last known price from each venue within `staleness <= 500ms`
  - if fewer than `min_sources` available → fallback

### 5.3 Sampling at expiry
At expiry timestamp `T_expiry`:
- Freeze index input set by rules
- Compute close as of `T_expiry` (or within tolerance window)
- Persist:
  - per‑venue price used
  - computed close
  - decision path (fallback logic)

### 5.4 Fallback & refunds
Implement a strict policy:
- If sources >= min_sources: settle normally
- Else: delay settlement up to `X` seconds
- If still insufficient: refund round bets

### 5.5 Prevent price disputes
- Publish the rules in UI
- Provide per‑round audit view (even if hidden behind “details”)

---

## 6) Payout engine (dynamic multipliers)
### 6.1 Why dynamic
Different tiles have different probabilities. Dynamic multipliers keep:
- stable expected edge
- stable economics across volatility regimes

### 6.2 Engineering approach (MVP)
Compute `p` (win probability) from recent history:
- Maintain rolling window stats per:
  - instrument (BTC/ETH)
  - timeframe (30s/60s)
  - tile distance bucket or absolute bounds
  - volatility bucket (optional but recommended)

Then:
- multiplier `m = (1 - edge) / p`
- clamp: `m_min <= m <= m_max`

### 6.3 Locking
At bet placement:
- record `multiplier_locked`
- never recompute for that bet

### 6.4 Update cadence
- Recompute grid multipliers every 1–3 seconds
- Broadcast to clients via WebSocket

---

## 7) Wallet & ledger design (accounting that cannot break)
### 7.1 Use a ledger, not “balance math”
Balance is derived:
- `balance = sum(credits) - sum(debits)`

### 7.2 Ledger entry schema (minimum)
- `entry_id` (uuid)
- `user_id`
- `type` (DEPOSIT, BET_PLACED, SETTLEMENT_WIN, REFUND, ...)
- `amount` (signed)
- `currency` (USD or USDC-like internal unit)
- `ref_type` (BET, ROUND, TX)
- `ref_id`
- `created_at`
- `idempotency_key`

### 7.3 Idempotency keys everywhere
- Bet placement: `placebet:{user}:{round}:{tile}:{nonce}`
- Settlement: `settle:{bet_id}`
- Refund: `refund:{round_id}`

### 7.4 Concurrency rules
- Use transactions with row‑level locks for wallet debits
- Prevent double spend under parallel clicks

---

## 8) Realtime architecture (WebSocket)
### 8.1 Events to broadcast
- `PRICE_TICK` (index price, timestamp)
- `ROUND_STATE` (round id, expiry, cutoff, server time)
- `GRID_UPDATE` (tile bounds, multipliers)
- `BET_ACK` (placed, bet_id, locked params)
- `SETTLEMENT` (bet_id, win/lose, payout)
- `WALLET_UPDATE` (new balance, ledger snapshot pointer)

### 8.2 Client time vs server time
- Always display **server time** in UI
- Client countdown should be corrected by periodic server time sync events

### 8.3 Backpressure & scaling
- Use a pub/sub layer (Redis streams, NATS, Kafka) for fanout
- Split channels by instrument + TF to reduce bandwidth

---

## 9) Cutoff window & fairness
### 9.1 Why cutoff is mandatory
Without cutoff, users with faster network/feeds can:
- place bets milliseconds before expiry after seeing near‑final price

### 9.2 Implementation
- If `server_now >= expiry_ts - cutoff_ms`: reject bet placement
- Cutoff values should be tuned per TF:
  - 30s: 700–1200ms
  - 60s: 900–1500ms

### 9.3 Handling disputes
- Log cutoff enforcement decisions
- Return clear error code to client

---

## 10) Anti‑abuse & security (practical)
### 10.1 Rate limiting
- per user, per IP, per device session
- cap clicks per second, bets per round

### 10.2 Anomaly detection
- win rate anomalies by user vs population
- repeated last‑cutoff attempts
- multi‑account clusters

### 10.3 DDoS & realtime hardening
- WAF at edge
- websocket connection limits
- degrade gracefully: if feed fails, freeze betting and show status

---

## 11) Data model (suggested tables)
- `users`
- `sessions`
- `wallets`
- `ledger_entries`
- `rounds`
- `bets`
- `settlements`
- `oracle_samples`
- `grid_snapshots` (optional)
- `limits` (user responsible settings)
- `abuse_events`

---

## 12) Service decomposition (MVP vs scale)
### 12.1 MVP (simpler deployment)
Single backend with modules:
- market data ingestion + index
- bet placement API
- settlement scheduler
- wallet + ledger

### 12.2 Scale (recommended split)
- **MarketDataService**
- **BetService**
- **SettlementService**
- **WalletService**
- **RealtimeGateway** (WebSocket edge)
- Shared DB + event bus

---

## 13) Scheduling settlement (how to implement cleanly)
### 13.1 Candle‑aligned approach
- Precompute next round expiry timestamps for each TF
- Use a scheduler loop that:
  - wakes up slightly before expiry
  - locks oracle close
  - settles all bets in that round
  - broadcasts results

### 13.2 Avoid cron drift
- Use monotonic time + server NTP sync
- Keep a “round state machine” in DB:
  - OPEN -> CUTOFF -> SETTLING -> SETTLED/REFUNDED

### 13.3 Idempotent settlement worker
- Claim a round via DB lock (advisory lock or status update with WHERE clause)
- If already settled, no‑op

---

## 14) API design (minimal, stable)
### 14.1 REST endpoints
- `POST /auth/login`
- `GET /wallet`
- `POST /wallet/deposit` (provider integration later)
- `POST /bets/place`
- `GET /bets/active`
- `GET /bets/history`
- `GET /rounds/current?instrument=BTC&tf=60`
- `GET /rules` (oracle + boundary definitions)

### 14.2 WebSocket channels
- `/ws?instrument=BTC&tf=60`
- `/ws?instrument=ETH&tf=30`

---

## 15) Tech stack options (pragmatic)
### 15.1 Backend
- **Node.js (NestJS / Fastify)**: strong websockets + concurrency via clustering
- **Go**: excellent realtime, low latency, simple deployment
- **Python (FastAPI)**: fine for MVP; may need careful optimization for p99

**Recommendation:** Go or Node for realtime‑heavy core.

### 15.2 Data stores
- Postgres (authoritative)
- Redis (realtime cache + pub/sub)
- Optional Kafka/NATS later

### 15.3 Frontend
- React / Next.js web
- React Native for mobile (if needed)
- Canvas/WebGL for grid animations (optional)

### 15.4 Observability
- Prometheus/Grafana
- OpenTelemetry traces
- Structured logs with correlation IDs

---

## 16) Testing strategy (what breaks first)
### 16.1 Deterministic property tests
- For random tiles and closes:
  - if close in [L,U) => WIN else LOSE
- Boundary tests:
  - close == U -> next tile, should LOSE for [L,U)

### 16.2 Oracle replay tests
- Record raw venue tick streams
- Replay through index computation and verify close output is stable

### 16.3 Load tests
- WebSocket fanout (10k–100k conns depending on target)
- Placement burst tests at round start and pre‑cutoff

### 16.4 Ledger invariants
- No negative wallet beyond allowed
- Credits/debits reconcile daily
- Idempotency prevents double credit

---

## 17) Upgrade path to Web3 audit anchoring (Strategy B)
### 17.1 Batch proof design
Per round:
- Create settlement records
- Build Merkle tree of `(bet_id, outcome, payout, close, tile_bounds)`
- Store tree + proofs server side
- Publish root on chain or transparency log

### 17.2 Client verification
- Provide endpoint: `GET /settlements/proof?bet_id=...`
- Return Merkle proof + root + transaction reference

### 17.3 Benefits
- Strong integrity claim: “we can’t rewrite results later”
- Reduces trust friction for skeptical users

---

## 18) Implementation plan (developer steps)
### Phase 1 — MVP core loop
1. Candle‑aligned rounds for 30s + 60s
2. Multi‑venue price ingestion and index computation
3. Bet placement with cutoff enforcement
4. Settlement engine with oracle sampling + idempotent settlement
5. Wallet ledger with reconciliation script
6. WebSocket realtime updates: price + round state + settlement

### Phase 2 — Economics & protection
1. Dynamic payout engine (probability‑based)
2. Rate limiting + abuse logging
3. Better fallback/refund handling

### Phase 3 — Trust layer
1. Publish oracle + settlement audit UI
2. Optional Merkle anchoring (hybrid web3)

---

## Appendix A — Event message examples (JSON)
### PRICE_TICK
```json
{
  "type": "PRICE_TICK",
  "instrument": "BTC",
  "ts": 1730000000123,
  "index_price": 29912.4
}
```

### ROUND_STATE
```json
{
  "type": "ROUND_STATE",
  "instrument": "BTC",
  "tf": 60,
  "round_id": "BTC-60-1730000060",
  "server_ts": 1730000000123,
  "expiry_ts": 1730000060000,
  "cutoff_ts": 1730000058800,
  "status": "OPEN"
}
```

### BET_ACK
```json
{
  "type": "BET_ACK",
  "bet_id": "b_01J...",
  "stake": 5,
  "instrument": "BTC",
  "tf": 60,
  "round_id": "BTC-60-1730000060",
  "L": 29900,
  "U": 29910,
  "multiplier": 2.1
}
```

### SETTLEMENT
```json
{
  "type": "SETTLEMENT",
  "bet_id": "b_01J...",
  "outcome": "WIN",
  "close": 29905.2,
  "payout": 10.5,
  "settled_ts": 1730000060123
}
```

---

**End of developer guide**
