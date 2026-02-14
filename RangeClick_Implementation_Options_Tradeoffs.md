# RangeClick — Implementation Options & Tradeoffs (Cohesive Decision Doc)
**Audience:** CEO + Engineering leadership  
**Purpose:** Enumerate realistic implementation ways and explain *why* one is better/worse for our specific product constraints (speed + fairness + trust).  
**Core constraint:** **dopamine-loop latency beats ideology**. We can add transparency layers, but we can’t ship a slow game.

---

## 1) What we are building (in one sentence)
A real‑time, grid‑based wagering game on BTC/ETH where users click one or more price‑range tiles; bets lock immediately; at expiry we compute a deterministic **oracle close** and settle win/lose instantly.

---

## 2) Our hard requirements (these dictate architecture)
### 2.1 Realtime + speed
- Placement ACK p95 < 200ms (or UX feels “laggy/rigged”)
- Settlement publish p95 < 300ms after expiry

### 2.2 Determinism + auditability
- Settlement is reproducible from (expiry_ts, tile bounds, oracle close)
- Dispute handling must be “mechanical”, not opinion-based

### 2.3 Anti‑abuse
- Cutoff window enforced by **server time**
- Resistance to single-venue spikes (index across venues)

These three requirements immediately eliminate certain “pure” approaches for MVP.

---

## 3) The Implementation Options (the real menu)
### Option A — **Centralized Web2 Core (Fast MVP)**
**What it is**
- Custodial wallet + ledger in Postgres
- Market data ingestion from exchanges → compute index
- WebSocket gateway for price/round/settlement
- Settlement engine off‑chain, writes results to DB, broadcasts outcome

**Why it’s good**
- **Best possible latency** (our #1 feature)
- Simplest reliability, easiest debugging
- Cheapest to run; fastest to iterate UX/economy

**Why it’s bad**
- Trust is “because we say so”, unless we add transparency
- Reputation risk: “they can edit results” accusations

**When it wins**
- MVP and early growth
- When our biggest risk is product-market fit, not trustlessness

**What must be done to make it acceptable**
- Strict oracle definition + per‑round audit logs
- Immutable ledger semantics (append-only)
- Strong observability + incident playbooks

**Verdict**
- **Best MVP base**. Ship this first.

---

### Option B — **Hybrid Web2 Core + On‑chain Audit Anchoring (Best Balance)**
**What it is**
- Same as Option A for realtime execution
- Additionally: publish an integrity anchor per round/batch:
  - Merkle root of settlements OR a batch hash
  - posted to L2 / public chain / transparency log
- Provide proofs for users (optional UI)

**Why it’s good**
- Near-Web2 speed + **cryptographic “we can’t rewrite history”**
- Strong reputational defense
- Still allows custodial UX (instant bets, no gas)

**Why it’s bad**
- More complexity:
  - building Merkle trees
  - storing proofs
  - publishing roots reliably
  - handling chain outages gracefully
- Doesn’t remove regulatory needs; it’s not a bypass

**When it wins**
- When we need speed **and** we want to scale trust publicly
- When we expect adversarial users and public scrutiny

**Verdict**
- **Best long-term architecture** once MVP loop works.
- Design the MVP so this can be added without refactor.

---

### Option C — **Fully On‑chain Execution (Trustless Casino Mode)**
**What it is**
- Bets placed on chain (L2) via smart contract
- Oracle writes close price on chain
- Contract computes winners, pays out on chain

**Why it’s good**
- Maximum transparency & verifiability
- Custody risk shifts away from us

**Why it’s bad (for our product)**
- Wallet onboarding friction
- Gas fees + chain confirmation delays
- UX cannot match “instant click dopamine” reliably
- MEV/front‑running and oracle manipulation surface area rises
- Settlement latency spikes = user rage

**When it wins**
- If the brand is explicitly “crypto-native on-chain wagering”
- If users accept slower rounds and higher friction

**Verdict**
- **Not recommended for MVP** if speed is core.
- Consider later only if we pivot to “on-chain-first” audience.

---

### Option D — **P2P Prediction Market (Polymarket-style)**
**What it is**
- Users trade against each other; price reflects probabilities
- Either:
  - orderbook matching, or
  - AMM/CFMM markets for each range outcome
- Platform acts as exchange, not house (in theory)

**Why it’s good**
- Platform isn’t “the house” (different risk profile)
- Market-driven pricing can be elegant

**Why it’s bad (for our exact mechanic)**
- Complexity explosion:
  - liquidity requirements per tile/round
  - thin markets = terrible UX
  - market-making or subsidies needed
- Slower “click → result” loop unless heavily engineered
- Our UX is simple fixed-odds; P2P introduces pricing complexity

**When it wins**
- If we want to become a full “prediction market” product
- If we can guarantee deep liquidity (hard)

**Verdict**
- **Wrong shape for MVP.** Too complex for the dopamine-first spec.

---

### Option E — **Casino Provider / Turnkey White‑Label (Fastest to Launch, Lowest Control)**
**What it is**
- Use an existing gambling platform provider:
  - wallet, KYC, payments, compliance, backoffice
- We implement only UI/game front-end + game logic plugin (if allowed)

**Why it’s good**
- Launch speed and operational tooling
- Some compliance rails already exist

**Why it’s bad**
- Vendor lock-in
- Limited control over latency and oracle definition
- Revenue share and constraints
- Harder to build proprietary edge

**When it wins**
- If the goal is *fast market test* with minimal engineering
- If we accept being constrained short-term

**Verdict**
- Viable only if speed-to-market is everything and differentiation is secondary.

---

## 4) The “Data Feed / Oracle” sub-options (critical regardless of architecture)
### Oracle approach 1 — Single exchange last price (not recommended)
- Easy, cheap
- But spikes/manipulation disputes are guaranteed

### Oracle approach 2 — Multi-exchange index (recommended)
- Harder engineering, but significantly more robust
- Use median/trimmed mean + staleness rules

### Oracle approach 3 — Third-party index provider
- Faster to implement, potentially more credible
- Adds vendor dependency and cost
- Still need fallback logic

**Recommendation**
- MVP: Multi-exchange index if team can handle it; else third-party provider.
- Publish rules + audit logs from day one.

---

## 5) Settlement scheduling options (impacts scalability)
### Model 1 — Candle-aligned rounds (recommended)
- Batch bets by TF boundary
- One close per round
- Simple to reason and audit

### Model 2 — Rolling per-bet expiry
- More granular, arcade feel
- Many expiries → scheduling complexity and higher load

**Recommendation**
- Candle-aligned for MVP; rolling can be a feature later.

---

## 6) Payout engine options (economics + fairness)
### Payout A — Fixed payout per TF
**Pros:** simplest UI/logic  
**Cons:** unbalanced across tiles; easily becomes unfair or exploitable

### Payout B — Distance-based payout
**Pros:** intuitive (“further = higher payout”)  
**Cons:** not stable under volatility regimes; needs constant tuning

### Payout C — Probability-based payout (recommended)
- Estimate p (win probability), set multiplier = (1-edge)/p
- Works consistently across volatility regimes
- Requires statistical pipeline but is scalable and defensible

**Recommendation**
- Start with probability-based using simple empirical stats; refine later.

---

## 7) Scaling patterns (how each option scales)
### Web2 / Hybrid scaling
- Horizontal scale WebSocket gateways
- Partition channels by (instrument, TF)
- Use Redis/NATS/Kafka for pub/sub
- Postgres for authoritative ledger (with careful transaction design)

### On-chain scaling
- Depends on L2 throughput
- Still needs off-chain indexing, UI infra
- Chain spikes directly become UX spikes

---

## 8) Decision: what we should choose and why
### Recommended build path (pragmatic)
**Phase 1 (MVP): Option A — Centralized Web2 core**
- Ship the loop fast
- Validate retention and unit economics
- Build robust oracle logs + ledger invariants

**Phase 2 (Trust upgrade): Option B — Hybrid anchoring**
- Add batch settlement Merkle root anchoring
- Add proof endpoints + transparency UI

**Phase 3 (Optional): Evaluate on-chain execution**
- Only if strategy changes to “crypto-native trustless casino”
- Only after we can tolerate latency variability

### Why this is the best path
- It respects the product’s #1 feature: **speed**
- It preserves an upgrade path to public verifiability
- It avoids the complexity trap of P2P markets and pure on-chain settlement

---

## 9) Implementation complexity scorecard (MVP feasibility)
Scoring: 1=easy, 5=hard

| Option | Latency UX | Complexity | Trust | Cost | MVP Fit |
|---|---:|---:|---:|---:|---:|
| A Web2 | 5 | 2 | 2 | 2 | 5 |
| B Hybrid | 5 | 3 | 4 | 3 | 5 |
| C On-chain | 2 | 5 | 5 | 4 | 2 |
| D P2P Market | 3 | 5 | 4 | 4 | 1 |
| E White-label | 4 | 2 | 2–3 | 3 | 3–4 |

Interpretation:
- **A** is the fastest to validate product.
- **B** is the best “serious” version after validation.
- **C/D** are conceptually cool but misaligned with dopamine-first requirements.
- **E** is a tactical shortcut with long-term constraints.

---

## 10) Next decisions we must lock (developer checklist)
1. Choose Option A now, architect for Option B later
2. Candle-aligned vs rolling expiry (recommend candle-aligned)
3. Oracle: multi-exchange index vs vendor index provider
4. Cutoff window per TF
5. Probability-based payout pipeline and clamping rules
6. Ledger + idempotency strategy (must be correct from day one)
7. WebSocket event contract (message types, channel partitioning)

---

**End of decision document**
