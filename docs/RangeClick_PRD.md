# RangeClick — Product Definition (PRD / Spec)
**Version:** 0.9 (Draft)  
**Owner:** CEO / Product  
**Product type:** Real‑time price‑range wagering game (BTC/ETH)  
**Core promise:** *Click a price range. If price **closes** inside that range at expiry, you win — instantly.*

---

## 1) Executive Summary
RangeClick is a high‑frequency, grid‑based wagering game on BTC and ETH. Users select a timeframe (e.g., 30s / 60s / 5m), choose a stake amount (preset chips or custom), then click one or multiple **price‑range tiles** (grid squares). Each click places an irreversible wager. At expiry, we compute the **reference close price** using a defined market data oracle/index. If the close lands inside the selected tile’s range, the wager settles as a win and pays out immediately. Otherwise it settles as a loss.

The product is designed for:
- **Speed:** ultra‑low latency placement + settlement.
- **Clarity:** simple rules, deterministic settlement.
- **Dopamine loop:** rapid rounds, immediate feedback, streaks, progression.
- **Trust:** transparent oracle rules + auditability (potentially Web3‑inspired anchoring).

---

## 2) Product Goals
### 2.1 Primary goals
1. **Instant wagering experience**: one‑tap placement and near‑instant settlement.
2. **High repeat rate**: maximize session length and retention via fast rounds + clear outcomes.
3. **Operational integrity**: deterministic settlement, auditable results, anti‑abuse protection.

### 2.2 Non‑goals (for MVP)
- Full P2P prediction market (orderbook / AMM).
- Complex cash‑out / early exit mechanics.
- Full on‑chain execution of every bet (too slow/expensive for MVP).

---

## 3) Target Users & Use Cases
### 3.1 Core persona
- Mobile‑first users who prefer short rounds, instant feedback, simple UX.
- Not professional traders; product reads as a game.

### 3.2 Use cases
- “I have 3 minutes; I want quick rounds.”
- “I want to place multiple tiles to increase win chance.”
- “I want the payout to be obvious before I click.”

---

## 4) Key Product Concepts (Definitions)
### 4.1 Instrument
- **BTCUSD** and **ETHUSD** (or BTCUSDT/ETHUSDT as underlying feeds), presented as “BTC” and “ETH”.
- The instrument label must match the oracle/index definition (avoid ambiguity).

### 4.2 Timeframe (TF)
Time to expiry for each wager:
- MVP: **30s** and **60s** (optionally add **5m** later as “Pro”)
- Each TF has its own grid scale, payout curve, and bet cutoff window.

### 4.3 Grid / Tiles / Price Ranges
- The screen shows a **grid of tiles** representing discrete price intervals.
- Each tile maps to an interval: **[L, U)** (lower bound inclusive, upper bound exclusive) unless specified otherwise.

**Example (BTC):**
- Tile width Δ = $10
- Tile boundaries: … 29890–29900, 29900–29910, 29910–29920 …

**Tile identity (must be deterministic):**
- `tile_id = instrument + expiry_timestamp + L + U + grid_version`

### 4.4 Wager (Bet)
A bet is created when a user clicks a tile:
- **Irreversible**: stake is deducted immediately; bet cannot be canceled (MVP).
- A user may place multiple bets per round (multi‑tile).

### 4.5 Expiry Timestamp
Each bet expires at a precise UTC timestamp:
- Example for TF=60s: bet placed at 12:00:12.300 UTC expires at 12:01:12.300 UTC **or** expires aligned to candle boundaries (see Section 6).
- **We must choose one model and keep it consistent.**

### 4.6 Close Price (Reference)
The **close** is the authoritative reference price used to settle bets.
- Close price source must be **defined, deterministic, and auditable** (Section 7).

### 4.7 Settlement
At expiry, each bet is settled:
- **WIN** if `close ∈ [L, U)`
- **LOSE** otherwise

### 4.8 Payout
If win, user receives:  
- `payout = stake × multiplier`
- profit = `payout − stake` (or “net profit” displayed separately)

If lose, user receives:
- `payout = 0` (stake already deducted)

---

## 5) Core User Flow (Gameplay Loop)
1. **Select Asset**: BTC or ETH
2. **Select TF**: 30s / 60s (later 5m)
3. **Select Stake**: preset chips ($1, $3, $5, $10) + custom
4. **Click Tile(s)**:
   - immediate haptic feedback + sound
   - tile becomes “LOCKED”
   - stake deducted instantly
5. **Countdown**:
   - show remaining time per bet
   - show “My Active Bets” list (tile, stake, multiplier, expiry)
6. **Settlement** at expiry:
   - highlight winning tile (if any)
   - update wallet + show payout animation
   - update streak / progression

UX principle: *No extra confirmation dialogs by default.* Any friction kills conversion. If needed, provide an optional “confirm bets” toggle in settings.

---

## 6) Time Model (Round Scheduling) — Must Decide
We must define how expiry timestamps work. Two viable models:

### Model A — Rolling expiry (per‑bet expiry)
- Each bet expires exactly `TF` after placement.
- Pros: simple mentally; always available; “arcade” feel.
- Cons: more complex to batch settlement; harder to show “rounds”.

### Model B — Candle‑aligned rounds (global rounds)
- Bets are placed into discrete rounds aligned to time boundaries.
- Example: 60s TF rounds align to each minute (12:00:00–12:00:59.999).
- Pros: easy to message (“this round ends in 8s”); simpler batching.
- Cons: last‑second placement creates fairness/latency issues unless cutoff window is used.

**Recommendation for MVP:** Model B (candle‑aligned) + strict cutoff window to prevent last‑ms edge.

---

## 7) Oracle / Price Index — Trust Anchor (Non‑Negotiable)
### 7.1 Why this matters
The #1 reason users claim a game is rigged is price definition ambiguity. We must:
- define the oracle precisely,
- log its inputs,
- publish a verifiable audit trail.

### 7.2 Oracle options
**Option 1: Multi‑exchange index (recommended)**
- Use several high‑liquidity venues (e.g., Binance, Coinbase, Kraken, OKX).
- Compute index as median or trimmed mean of last prices at sampling time.
- Pros: resistant to single‑venue spikes.
- Cons: engineering + monitoring overhead.

**Option 2: Single‑venue reference**
- Use one exchange’s last trade price.
- Pros: simpler.
- Cons: manipulable, disputes likely.

**Recommended:** Multi‑exchange index with deterministic rules.

### 7.3 Sampling rule
Define **exactly** how close is computed at expiry:
- Choose sampling timestamp: `T_expiry`
- Query index components within a tolerance window (e.g., ±250ms) and compute index.
- If a venue feed is missing, apply fallback rules.

### 7.4 Fallback / outage rules (must be public)
Examples (choose explicit thresholds):
- If ≤1 venue missing: compute using remaining venues.
- If >1 venue missing: delay settlement up to X seconds OR refund all bets in that round.
- If index cannot be computed reliably: refund affected bets.

### 7.5 Boundary conditions
Define whether close exactly equals U:
- We define tiles as **[L, U)** to avoid double inclusion.
- If `close == U`, it belongs to the next tile (U–U+Δ).

---

## 8) Payout Design (Fixed vs Dynamic)
### 8.1 Payout objective
Payout must reflect win probability and maintain a stable **house edge** across:
- assets (BTC vs ETH),
- timeframes,
- volatility regimes.

### 8.2 Fixed payout (simple)
For each TF, all tiles pay the same multiplier.
- Works only if clickable tiles are limited to a small band around spot.
- Risk: unbalanced economics, predictable abuse patterns.

### 8.3 Dynamic payout (recommended)
Each tile has its own multiplier based on **estimated win probability** `p`:
- `multiplier = (1 − edge) / p`
- where `edge` is target house edge (e.g., 7%)

**How to estimate p (MVP methods):**
1. **Empirical / historical**: compute frequency that close lands in that interval for the given TF, conditioned on volatility bucket.
2. **Volatility model**: approximate returns distribution (e.g., normal / t‑distribution) using recent realized volatility; compute interval probability.

### 8.4 User‑facing display
Before click, user must see:
- stake,
- multiplier,
- potential win payout,
- potential loss (stake).

Example:
- Stake $5
- Multiplier 2.10×
- “Win $10.50”

### 8.5 Guardrails
- Min multiplier and max multiplier caps.
- Max tiles per round per user.
- Dynamic multipliers update frequency (e.g., every 1–3 seconds) but must lock at bet placement.

---

## 9) Wallet & Ledger (Accounting Integrity)
### 9.1 Wallet model (MVP)
- Internal custodial balance (fast, instant).
- Every event is stored in an immutable ledger table.

### 9.2 Ledger events
- `DEPOSIT`
- `BET_PLACED` (stake deducted)
- `BET_SETTLED_WIN` (payout credited)
- `BET_SETTLED_LOSS` (no credit)
- `REFUND` (if oracle outage / invalid round)
- `WITHDRAWAL` (future)

### 9.3 Idempotency & reconciliation
- Every bet settlement must be idempotent (safe to retry).
- Daily reconciliation job verifies:
  - sum(wallet balances) == sum(ledger credits − debits)
  - no negative balance states beyond allowed.

---

## 10) Latency & Performance (SLOs)
Speed is a core product feature. Define these service‑level objectives:

### 10.1 Placement
- **Place bet ACK**: p95 < **200ms**, p99 < **400ms**
- UI should optimistically lock tile immediately; server confirms.

### 10.2 Market data
- Tick/index updates to client: p95 < **250ms**
- Client clock drift handling: server time is authoritative.

### 10.3 Settlement
- Results broadcast: p95 < **300ms** after expiry, p99 < **800ms**
- Wallet update + UI animation must feel instant.

---

## 11) Fairness & Anti‑Abuse (Critical)
### 11.1 Cutoff window (anti last‑ms advantage)
To prevent “sniping” right before expiry:
- Disallow bet placement within last **X ms** of round.
- Example: cutoff = 800ms for 30s, 1200ms for 60s (tune empirically).
- Server time governs cutoff (not client time).

### 11.2 Rate limiting
- Max bets per user per round.
- Max requests/sec per user + per IP.
- Device fingerprinting for repeated abuse (careful with privacy laws).

### 11.3 Market manipulation resistance
- Use index across venues.
- Detect abnormal spikes and quarantine rounds if index deviates beyond threshold.

### 11.4 Multi‑account / bonus abuse
If promotions exist:
- enforce KYC/age/geo rules as required,
- limit promo eligibility by identity/device.

---

## 12) Web3‑Style Auditability (Recommended Hybrid)
We can borrow Polymarket’s “trust anchor” idea without forcing on‑chain execution of every click.

### 12.1 Settlement anchoring
At end of each round (or batch of rounds), compute a Merkle tree over:
- bet_id, user_id (hashed), tile bounds, expiry, close, outcome, payout
Publish:
- Merkle root on a public chain (cheap L2) or a public transparency log.
This enables:
- later proof that settlements were not altered retroactively.

### 12.2 Why hybrid
- Off‑chain execution delivers speed.
- On‑chain anchor delivers trust and reputational defense.

### 12.3 Scope
MVP can ship without anchoring; add once core loop is validated.
But oracle and audit logs must exist from day one.

---

## 13) UX & Design Requirements
### 13.1 UI surfaces
- **Play screen**: asset, TF, stake chips, grid, active bets panel, countdown
- **Wallet**: balance, transaction list, deposits/withdrawals (future)
- **Profile**: streaks, XP, rank, achievements, responsible limits

### 13.2 Feedback design
- Click feedback: haptic + subtle sound.
- Win: strong positive reinforcement (confetti, animation).
- Loss: quick minimal feedback (avoid long negative state).
- Must allow “reduced motion / mute” accessibility toggles.

### 13.3 Prevent user confusion
- Visible definition of close and tile boundaries.
- “Rules” page with examples and boundary cases.

---

## 14) Responsible Controls (Product Safety)
Even if positioned as a game, controls reduce harm and regulatory risk:
- deposit limits
- session time reminders
- optional self‑exclusion
- cooling‑off timer after large losses
- age gate + geo gating (jurisdiction dependent)

MVP: at minimum, session time reminders + stake limits + self‑imposed caps.

---

## 15) Data & Analytics (Metrics That Matter)
### 15.1 Core funnel
- Visit → Account created → Deposit → First bet → First settlement → Second session (D1)

### 15.2 Key product metrics
- **Bet conversion rate**: % of sessions that place ≥1 bet
- **Bets per session** + session duration
- **Round participation rate**
- **Retention**: D1, D7, D30
- **Net gaming revenue** (house edge realized)
- **Payout fairness indicators**: win rate distribution by TF/tile distance
- **Latency metrics**: placement p95, settlement p95

### 15.3 Anti‑abuse metrics
- late‑cutoff attempt rate
- suspicious win rate anomalies
- repeated multi‑account patterns

---

## 16) System Architecture (High‑Level)
### 16.1 Services
1. **Market Data Service**
   - consumes exchange feeds
   - computes index price
   - publishes realtime updates via WebSocket

2. **Bet Service**
   - validates user state + balance
   - applies cutoff + limits
   - writes bet record + debits ledger
   - returns ACK

3. **Settlement Engine**
   - triggers at expiry
   - samples oracle close
   - settles bets (win/lose) idempotently
   - credits payouts via ledger
   - broadcasts results

4. **Wallet/Ledger Service**
   - authoritative accounting
   - reconciliation + auditing

5. **Risk/Abuse Service**
   - rate limits, anomaly detection, rules engine

### 16.2 Data stores
- Postgres for authoritative tables (bets, ledger, users)
- Redis for realtime ephemeral state (rounds, current index, active subscriptions)

### 16.3 Realtime transport
- WebSocket for price + round + settlement events
- REST for account/wallet actions (login, deposit history)

---

## 17) Database Schema (MVP Suggested)
### 17.1 Tables
- `users`
- `wallets`
- `ledger_entries`
- `rounds` (if candle‑aligned)
- `tiles` (optional; can be generated deterministically)
- `bets`
- `settlements`
- `oracle_samples`
- `limits` (user responsible settings)
- `device_sessions` (optional abuse monitoring)

### 17.2 Key bet fields
- `bet_id`
- `user_id`
- `instrument`
- `tf`
- `round_id` or `expiry_ts`
- `L`, `U`
- `stake`
- `multiplier_locked`
- `placed_ts`
- `status` (PLACED, SETTLED, REFUNDED)
- `cutoff_applied` (bool)

---

## 18) Security Requirements
- WAF + DDoS protection (realtime app is a target)
- JWT/session hardening
- 2FA (optional, future)
- Secure storage for API keys (if any)
- Tamper‑evident audit logs for oracle and settlement

---

## 19) Edge Cases & Rules Page (Must Publish)
1. What if price equals upper boundary U? → **belongs to next tile**
2. What if oracle outage occurs? → **refund policy**
3. What if extreme volatility gaps across tiles? → still deterministic by close
4. What if user clicks multiple tiles? → independent bets
5. What if user balance insufficient mid‑multi‑click? → reject subsequent bets
6. What if user disconnects before settlement? → settlement still occurs; result stored; user sees on reconnect

---

## 20) Roadmap (Suggested)
### v1 (MVP)
- BTC/ETH
- TF: 30s + 60s
- Grid + multi‑tile
- Preset + custom stakes
- Custodial wallet
- Deterministic index oracle + logs
- Cutoff window + rate limits
- Basic streak/progression

### v1.5
- 5m “Pro mode”
- Improved dynamic payout with volatility buckets
- Basic responsible controls (limits, reminders)

### v2
- On‑chain settlement anchoring (Merkle root)
- Advanced analytics and personalization
- More assets (only after oracle robustness)

---

## 21) Open Decisions (Must Be Locked Before Build)
1. **Time model**: rolling vs candle‑aligned
2. **Oracle composition**: venues list + computation (median/trimmed mean)
3. **Sampling tolerance**: ±ms window at expiry
4. **Fallback policy**: missing venues, delayed settlement vs refunds
5. **Grid configuration**: tile width Δ by asset and TF; number of visible tiles
6. **Payout curve**: house edge target; caps; update frequency; lock behavior
7. **Cutoff window**: per TF; enforcement rules
8. **Limits**: max bets per round; max stake; custom stake min/max
9. **Compliance posture**: geo/age gate, KYC requirements, payment rails

---

## Appendix A — Example Payout Computation (Dynamic)
Given:
- stake S = $10
- estimated win probability p = 0.35
- house edge edge = 0.08

Multiplier:
- `m = (1 − 0.08) / 0.35 = 0.92 / 0.35 ≈ 2.6286`

User sees:
- “2.63×”
- “Win $26.30”

Settlement:
- if win: credit $26.30
- if lose: credit $0

---

## Appendix B — Deterministic Tile Boundaries
Let:
- tile width Δ
- reference center price P_ref (e.g., current index)
- tile index k ∈ Z

Define:
- `L_k = floor(P_ref / Δ) * Δ + k * Δ`
- `U_k = L_k + Δ`

Display k in a range [−N, +N] around center.

---

## Appendix C — Audit Log Requirements
For each round:
- expiry timestamp
- oracle venues used
- sampled prices per venue
- computed index close
- batch settlement hash (optional)

These records must be immutable (append‑only) and retained for dispute resolution.

---

**End of document**
