# Next steps

Short-term items to keep 0.9 on track:

1. Bootstrap a lightweight reconciliation job (cron or route) so `/admin/reconcile` reports drift and outputs a human-readable log.
2. Wire Merkle anchor publication to a periodic task so `/rounds/:id/proof` always has a root even if settlements run offline.
3. Add automated regression tests for ledger balance invariants (credits − debits = wallet balance) before enabling real funds.

Record of these ideas helps justify why future commits will contain backend jobs and tests.
