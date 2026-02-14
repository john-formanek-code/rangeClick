import { Knex } from 'knex';

export class ReconciliationService {
  constructor(private knex: Knex) {}

  /**
   * Verifies that wallet balances match the sum of ledger entries.
   */
  async reconcileAllWallets() {
    const results = [];
    const wallets = await this.knex('wallets').select('*');

    console.log(`🧹 Starting reconciliation for ${wallets.length} wallets...`);

    for (const wallet of wallets) {
      const ledgerSum = await this.knex('ledger_entries')
        .where({ wallet_id: wallet.id })
        .sum('amount as total')
        .first();

      const calculatedBalance = parseFloat(ledgerSum?.total || '0');
      const storedBalance = parseFloat(wallet.balance);
      const diff = Math.abs(calculatedBalance - storedBalance);

      const status = diff < 0.001 ? 'OK' : 'MISMATCH';
      
      if (status === 'MISMATCH') {
        console.error(`❌ DISCREPANCY: Wallet ${wallet.id} (User: ${wallet.user_id}). Stored: ${storedBalance}, Calculated: ${calculatedBalance}, Diff: ${diff}`);
      }

      results.push({
        walletId: wallet.id,
        userId: wallet.user_id,
        storedBalance,
        calculatedBalance,
        diff,
        status
      });
    }

    const mismatchCount = results.filter(r => r.status === 'MISMATCH').length;
    console.log(`✅ Reconciliation complete. Mismatches: ${mismatchCount}`);

    return {
      totalWallets: wallets.length,
      mismatchCount,
      timestamp: Date.now(),
      details: results.filter(r => r.status === 'MISMATCH')
    };
  }
}
