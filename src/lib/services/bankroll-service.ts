import { supabase } from '../supabase';
import type { BankrollAccount, BankrollTransaction, Platform, Currency, BankrollCategory } from '@/types';

const SID_REGEX = /\s*\[sid:([a-f0-9-]+)\]/i;
const TID_REGEX = /\[tid:([a-f0-9-]+)\]\s*/i;

function parseNotesMetadata(rawNotes: string | null | undefined): {
  notes: string;
  sessionId?: string;
  transferGroupId?: string;
} {
  if (!rawNotes) return { notes: '' };
  let clean = rawNotes;
  let sessionId: string | undefined;
  let transferGroupId: string | undefined;

  const sidMatch = clean.match(SID_REGEX);
  if (sidMatch) {
    sessionId = sidMatch[1];
    clean = clean.replace(SID_REGEX, '');
  }

  const tidMatch = clean.match(TID_REGEX);
  if (tidMatch) {
    transferGroupId = tidMatch[1];
    clean = clean.replace(TID_REGEX, '');
  }

  return {
    notes: clean.trim(),
    sessionId,
    transferGroupId,
  };
}

function serializeNotesWithSessionId(notes: string, sessionId?: string): string {
  const clean = (notes || '').replace(SID_REGEX, '').trim();
  return sessionId ? `${clean} [sid:${sessionId}]`.trim() : clean;
}

function mapRawTx(d: Record<string, unknown>): BankrollTransaction {
  const parsed = parseNotesMetadata(d.notes as string | null);
  return {
    id: String(d.id),
    accountId: String(d.account_id),
    type: d.type as BankrollTransaction['type'],
    amount: Number(d.amount),
    date: String(d.date),
    notes: parsed.notes,
    sessionId: parsed.sessionId,
    transferGroupId: parsed.transferGroupId,
    createdAt: String(d.created_at),
  };
}

/**
 * Service for managing user bankroll accounts and transactions via Supabase.
 * Uses atomic server-side PostgreSQL RPCs so transaction ledger and account
 * balances never drift out of sync.
 */
export const bankrollService = {
  async fetchAccounts(userId: string): Promise<BankrollAccount[]> {
    const { data, error } = await supabase
      .from('bankroll_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map(d => ({
      id: d.id,
      platform: d.platform as Platform,
      name: d.name,
      balance: Number(d.balance),
      currency: d.currency as Currency,
      category: d.category as BankrollCategory,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  },

  async createAccount(userId: string, account: Omit<BankrollAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankrollAccount> {
    const { data, error } = await supabase
      .from('bankroll_accounts')
      .insert({
        user_id: userId,
        platform: account.platform,
        name: account.name,
        balance: account.balance,
        currency: account.currency,
        category: account.category,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      platform: data.platform as Platform,
      name: data.name,
      balance: Number(data.balance),
      currency: data.currency as Currency,
      category: data.category as BankrollCategory,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('bankroll_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async fetchTransactions(userId: string): Promise<BankrollTransaction[]> {
    const { data, error } = await supabase
      .from('bankroll_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(d => mapRawTx(d as Record<string, unknown>));
  },

  /**
   * Atomically records a single transaction and updates the account balance in one PostgreSQL RPC.
   */
  async createTransaction(
    _userId: string,
    transaction: Omit<BankrollTransaction, 'id' | 'createdAt'>
  ): Promise<{ transaction: BankrollTransaction; newBalance: number }> {
    const dbNotes = serializeNotesWithSessionId(transaction.notes, transaction.sessionId);

    const { data, error } = await supabase.rpc('record_bankroll_transaction', {
      p_account_id: transaction.accountId,
      p_type: transaction.type,
      p_amount: transaction.amount,
      p_date: transaction.date,
      p_notes: dbNotes || null,
    });

    if (error) throw error;

    const payload = data as { transaction: Record<string, unknown>; newBalance: number };
    return {
      transaction: mapRawTx(payload.transaction),
      newBalance: Number(payload.newBalance),
    };
  },

  /**
   * Atomically executes a 2-leg internal transfer (`type = 'transfer'`) tagged with `[tid:<uuid>]`
   * and updates both source and destination balances in one PostgreSQL RPC.
   */
  async createTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    notes?: string
  ): Promise<{
    outTx: BankrollTransaction;
    inTx: BankrollTransaction;
    fromBalance: number;
    toBalance: number;
  }> {
    const { data, error } = await supabase.rpc('record_bankroll_transfer', {
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_amount: Math.abs(amount),
      p_date: date,
      p_notes: notes || null,
    });

    if (error) throw error;

    const payload = data as {
      outTx: Record<string, unknown>;
      inTx: Record<string, unknown>;
      fromBalance: number;
      toBalance: number;
    };

    return {
      outTx: mapRawTx(payload.outTx),
      inTx: mapRawTx(payload.inTx),
      fromBalance: Number(payload.fromBalance),
      toBalance: Number(payload.toBalance),
    };
  },

  /**
   * Deletes a transaction (or both legs if it belongs to a `[tid:<uuid>]` transfer pair)
   * and reconciles all account balances directly from the PostgreSQL ledger (`0.00` drift guarantee).
   */
  async deleteTransaction(
    userId: string,
    transaction: { id: string; transferGroupId?: string }
  ): Promise<{ deletedIds: string[]; reconciledBalances: { id: string; balance: number }[] }> {
    let deletedIds: string[] = [transaction.id];

    if (transaction.transferGroupId) {
      const { data: deletedRows, error: delErr } = await supabase
        .from('bankroll_transactions')
        .delete()
        .eq('user_id', userId)
        .ilike('notes', `%[tid:${transaction.transferGroupId}]%`)
        .select('id');

      if (delErr) throw delErr;
      if (deletedRows && deletedRows.length > 0) {
        deletedIds = deletedRows.map(r => r.id);
      }
    } else {
      const { error: delErr } = await supabase
        .from('bankroll_transactions')
        .delete()
        .eq('id', transaction.id)
        .eq('user_id', userId);

      if (delErr) throw delErr;
    }

    const { data: recData, error: recErr } = await supabase.rpc('reconcile_user_account_balances');
    if (recErr) throw recErr;

    const reconciledBalances = ((recData as Array<{ id: string; balance: number }>) || []).map(r => ({
      id: r.id,
      balance: Number(r.balance),
    }));

    return { deletedIds, reconciledBalances };
  },
};
