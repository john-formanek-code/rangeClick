# Gameplay loop

Outline for the 30s/60s experience described in the PRD:

1. Select instrument (BTC/ETH) and timeframe (30s or 60s). Each timeframe defines its own grid and expiry cadence.
2. Choose a stake from presets or a custom amount; the balance used is always the ledger-derived wallet in the backend.
3. Click one or more tiles in the upcoming round. The frontend locks the tile visually and posts `POST /bets/place` with locked multiplier + tile bounds.
4. Countdown updates in real time; Redux-like state comes from `WsMessageType.ROUND_STATE` and `WsMessageType.TIME_SYNC`.
5. At expiry, the backend computes the oracle close, settles each bet, writes ledger entries, and emits `SETTLEMENT` + wallet updates. Frontend shows win/lose animation, payout, and streak bar before the next column scrolls into view.

This note should serve as the source of truth when refining UI timing or onboarding flows.
