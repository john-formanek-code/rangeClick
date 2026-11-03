# Security checkpoints

SecurityService controls described in code:

1. Rate limiter per user (5 bets per 2s) with abuse log entries.
2. Responsible play limits stored in `user_limits` (max bet + max bets per round).
3. Cutoff enforcement using `round.cutoff_ts`; any bet after cutoff logs a `CUTOFF_SNIPING` event.
4. Win-rate anomaly detection triggered after every settlement run by user.

Placing these checks in a single note makes it easier to tie anomalies to logging and to evolve the compliance story later.
