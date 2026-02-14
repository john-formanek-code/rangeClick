import { Knex } from 'knex';
import { LedgerEntry, LedgerEntryType } from '@rangeclick/types';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';

export class LedgerService {
  constructor(private knex: Knex) {}

  // Atomic Transfer
  async createEntry(
    trx: Knex.Transaction,
    params: {
      userId: string;
      walletId: string;
      type: LedgerEntryType;
      amount: number;
      currency: string;
      refType: string;
      refId: string;
    }
  ): Promise<LedgerEntry> {
    const { userId, walletId, type, amount, currency, refType, refId } = params;

    // 1. Lock and Update Wallet
    const wallet = await trx('wallets')
      .where({ id: walletId })
      .forUpdate() // Lock row
      .first();

    if (!wallet) throw new Error('Wallet not found');

    const newBalance = parseFloat(wallet.balance) + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient funds');
    }

    await trx('wallets')
      .where({ id: walletId })
      .update({ balance: newBalance });

    // 2. Insert Ledger Entry
    // SQLite returning workaround: we generate ID
    const id = uuidv4();
    const now = new Date();
    
    await trx('ledger_entries')
      .insert({
        id,
        user_id: userId,
        wallet_id: walletId,
        type,
        amount,
        balance_after: newBalance,
        reference_type: refType,
        reference_id: refId,
        currency,
        created_at: now
      });

    return {
      id,
      userId,
      type,
      amount,
      currency,
      referenceId: refId,
      referenceType: refType as any,
      balanceAfter: newBalance,
      createdAt: now.getTime()
    };
  }

  // Helper to get wallet
  async getWallet(userId: string, currency: string = 'USD', trx?: Knex.Transaction) {
    const q = trx ? trx : this.knex;
    return q('wallets').where({ user_id: userId, currency }).first();
  }

  // Helper to create wallet if not exists (for demo)
  async ensureWallet(userId: string, trx?: Knex.Transaction) {
    const exists = await this.getWallet(userId, 'USD', trx);
    if (!exists) {
      const q = trx ? trx : this.knex;
      await q('wallets').insert({
        id: uuidv4(),
        user_id: userId,
        currency: 'USD',
        balance: 1000 // Free money for MVP testing!
      });
    }
    return this.getWallet(userId, 'USD', trx);
  }
}
