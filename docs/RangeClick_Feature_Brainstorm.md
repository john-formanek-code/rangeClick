# RangeClick — Feature Brainstorm (High‑Impact Ideas)
**Purpose:** Brainstorm cohesive feature set for a dopamine-first BTC/ETH range‑close game, while protecting integrity (fairness), retention, and monetization.  
**Rule:** Every feature must either increase **conversion**, **retention**, **trust**, or **economics** — ideally 2+ at once.

---

## 1) Core Gameplay Extensions (keep it simple, make it sticky)
### 1.1 “Rounds” modes
- **Arcade (30s / 60s):** default, fastest loop.
- **Pro (5m):** slower, “skill feeling,” higher stakes limits.
- **Turbo streak:** consecutive rounds auto-queued (no re-selecting TF/stake).

### 1.2 Grid variants
- **Centered grid:** always centered on current index price.
- **Trend grid:** grid biased in trend direction (more tiles above in uptrend).
- **Volatility adaptive tiles:** tile width Δ expands/contracts with volatility regime (prevents “too easy / too impossible”).

### 1.3 Multi-tile strategies (as UI patterns)
- **Spray (cover 3 adjacent tiles):** one tap places a predefined “spread” across multiple tiles.
- **Ladder (tiles above/below):** one tap creates a ladder of bets.
- **Bracket click:** choose center tile; app auto allocates to neighbors based on selected risk profile.

Why it matters: reduces friction → increases bets per minute.

---

## 2) Dopamine Mechanics (engagement without complexity)
### 2.1 Streaks & ranks
- **Win streak:** simple badge + multiplier visuals (no payout change unless explicitly designed).
- **Discipline streak:** streak for staying within self-imposed limits (good for safety + brand).
- **Rank ladder:** Bronze → Diamond based on volume + consistency.

### 2.2 “Near miss” feedback (careful)
- Show when close landed **one tile away** (“so close”) to trigger re-engagement.
- Must be subtle; overuse looks manipulative.

### 2.3 Reward cadence
- **Daily login bonus** in non-cash credits (or cosmetic points).
- **Daily missions:** “Win 2 rounds,” “Place 10 bets,” “Try ETH today.”
- **Weekly quests:** “7-day streak,” “Play 5 sessions,” “Try Pro mode.”

---

## 3) Social & Competitive (retention + viral loops)
### 3.1 Leaderboards (choose metric carefully)
- **Volume leaderboard** (engagement)
- **Win rate leaderboard** (can encourage exploit behavior)
- **Streak leaderboard** (dopamine)
- **“Fair play” leaderboard** (stayed within limits, reduces toxicity)

Best practice: separate leaderboards by TF to reduce unfair comparisons.

### 3.2 Spectate mode
- Watch live rounds with aggregated heatmap of where players clicked (no personal data).
- Shows “crowd distribution” per tile.
- Creates social proof and FOMO.

### 3.3 Friend challenges
- “Beat my streak in 10 rounds”
- Private rooms with invite links
- Optional “same tiles” mode: both players click from same grid snapshot.

---

## 4) Trust & Transparency (defense against “rigged”)
### 4.1 Round audit screen
For each round show:
- expiry timestamp (UTC)
- oracle index close
- venue prices used (if multi-exchange)
- tile boundaries rules
- settlement proof (if hybrid anchoring is enabled)

### 4.2 “Fairness meter”
- Status indicator: feeds healthy / degraded / fallback active
- When degraded: automatically freeze bets or increase cutoff window.

### 4.3 Public transparency page
- Uptime
- latency p95/p99
- settlement delay stats
- oracle sources list

This is reputational armor.

---

## 5) Economics & Monetization (without killing UX)
### 5.1 House edge visibility
- For regulated markets you may need to disclose.
- UX-friendly: show “payout is probability-based” + short explanation.

### 5.2 VIP tiers (ethical version)
- Cosmetic perks + analytics + faster UI themes
- Not “better odds” unless you want regulatory risk.
- Offer **reduced fees** (if fee-based) rather than better payouts.

### 5.3 Boosters (careful)
- “Double XP” weekend
- “Streak shield” (protects streak once per day)
- Avoid “odds boost” unless intentionally designed and legally reviewed.

---

## 6) Payments & Wallet UX (conversion engine)
### 6.1 One-tap deposit
- Saved payment methods
- Instant top-up prompts when balance low (non-intrusive)

### 6.2 Balance guardrails
- Auto set default stake based on balance (prevents accidental all-in).
- “Stop when balance hits X” (user-defined).

---

## 7) Responsible Controls (keep the brand alive)
### 7.1 Self-set limits
- daily deposit cap
- daily loss cap
- session time cap
- cooldown after X losses in a row

### 7.2 Reality checks
- “You’ve been playing 20 minutes” reminder
- Weekly summary: spend, wins/losses, time played

This reduces user regret and improves long-term retention.

---

## 8) Advanced Gameplay (optional, later)
### 8.1 “Close vs Touch” mode
- **Close mode:** must close inside tile (current spec)
- **Touch mode:** if price touches tile at any time during round (more arcade)

Touch mode increases win rate and excitement but needs different payout model.

### 8.2 Multi-outcome contracts
- “Close above current price” / “close below” (simple binary)
- “Close within band” (range)
- “Exact tile” (higher multiplier)

### 8.3 Replay & highlights
- Record last 10 rounds; show “your best streak,” “biggest win,” “closest miss.”

---

## 9) Personalization (retention + revenue)
### 9.1 Smart defaults
- Remember last instrument, TF, stake.
- Recommend TF based on behavior: “You play fastest rounds — keep 30s?”

### 9.2 User segments
- New user: simpler grid, fewer tiles
- Returning user: more tiles, more TF options
- High volume: advanced stats, pro mode surfaced

---

## 10) Data Features (lightweight, not trader-y)
### 10.1 Minimal “insight cards”
- “BTC volatility is high today — tiles are wider”
- “ETH has tighter ranges — higher precision required”

### 10.2 Confidence indicator (optional)
- Show a non‑predictive “volatility meter” for the next TF.
- Do not imply guaranteed prediction.

---

## 11) Event & Seasonal Features (easy wins)
- Weekly tournaments
- Seasonal cosmetics (themes, animations)
- Limited-time modes: “Only middle 5 tiles available” (simplifies UX)

---

## 12) Feature Prioritization (recommendation)
### MVP (ship fast)
- Turbo streak (auto-queue rounds)
- Multi-tile “Spray” 1-tap patterns
- Streaks + ranks
- Round audit screen (basic)
- Daily missions

### V1.5 (make it serious)
- Spectate mode (crowd distribution)
- Friend challenges / rooms
- Transparency page
- Volatility adaptive tiles

### V2 (trust + scale)
- Hybrid anchoring proofs (Merkle root)
- Tournaments + seasonal content
- Touch mode (new payout model)

---

## 13) Open questions (product decisions)
1. Do we want “Touch mode” at all (more casino) or keep “Close only” (more skill feeling)?
2. How far do we push “near miss” feedback without harming trust?
3. Should we show crowd distribution (social proof) or keep user decisions private?
4. Do we offer any boosters that impact payout (high risk) or only cosmetics/XP?

---

**End of brainstorm**
