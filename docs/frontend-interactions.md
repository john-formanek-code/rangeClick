# Frontend interactions

Key behaviors in `apps/web`:

* Scroll-based columns: active round scrolls from right-to-left using `scrollSpeed = (COL_WIDTH + COL_GAP) / 60`.
* Bet placement: clicking a tile sends `POST /bets/place` with `tileId`, bounds, multiplier, and idempotency key; UI shows locking/animation while waiting.
* Toast + deposit: `handleDeposit` hits `/wallet/deposit`, triggers wallet refresh, and re-fetches bets for immediate feedback.
* Settled rounds flash: `settledRounds` state keeps winning tile highlighted for `SETTLE_FLASH_MS` before fading.
* Settings modal: `max_bet_amount` and `max_bets_per_round` map directly to `/settings` endpoints for responsible play enforcement.

Store this note near UI work so design tweaks stay aligned with API expectations.
