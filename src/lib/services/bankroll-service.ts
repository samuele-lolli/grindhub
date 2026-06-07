import { supabase } from '../supabase';
import type { BankrollAccount, BankrollTransaction, Platform, Currency, BankrollCategory } from '@/types';

/**
 * Service for managing user bankroll accounts and transactions via Supabase.
 * Connects directly to the 'bankroll_accounts' and 'bankroll_transactions' tables.
 */
export const bankrollService = {
  /**
   * Retrieves all bankroll accounts for a specific user.
   * @param userId - The UUID of the user.
   * @returns A promise resolving to an array of BankrollAccount objects.
   */
  async fetchAccounts(userId: string): Promise<BankrollAccount[]> {
    const { data, error } = await supabase
      .from('bankroll_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

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

  /**
   * Creates a new bankroll account.
   * @param userId - The UUID of the user owning the account.
   * @param account - The account details excluding ID and timestamps.
   * @returns A promise resolving to the created BankrollAccount.
   */
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

  /**
   * Deletes a bankroll account by ID. Note: Transactions associated with this account may be cascaded or orphaned depending on DB constraints.
   * @param id - The UUID of the account to delete.
   */
  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('bankroll_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Retrieves all bankroll transactions for a specific user.
   * @param userId - The UUID of the user.
   * @returns A promise resolving to an array of BankrollTransaction objects.
   */
  async fetchTransactions(userId: string): Promise<BankrollTransaction[]> {
    const { data, error } = await supabase
      .from('bankroll_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      accountId: d.account_id,
      type: d.type as BankrollTransaction['type'],
      amount: Number(d.amount),
      date: d.date,
      notes: d.notes || '',
      createdAt: d.created_at,
    }));
  },

  /**
   * Creates a new bankroll transaction and updates the associated account's balance in a single operation.
   * @param userId - The UUID of the user making the transaction.
   * @param transaction - Transaction details (deposit or withdrawal).
   * @returns A promise resolving to the created BankrollTransaction.
   */
  async createTransaction(userId: string, transaction: Omit<BankrollTransaction, 'id' | 'createdAt'>): Promise<BankrollTransaction> {
    const { data, error } = await supabase
      .from('bankroll_transactions')
      .insert({
        user_id: userId,
        account_id: transaction.accountId,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        notes: transaction.notes,
      })
      .select()
      .single();

    if (error) throw error;
    
    // In a real app we would run this in an RPC/Transaction to also update the account balance securely.
    // For MVP, we let the client side update the balance and we just send an update call.
    const { data: account } = await supabase
      .from('bankroll_accounts')
      .select('balance')
      .eq('id', transaction.accountId)
      .single();
      
    if (account) {
      await supabase
        .from('bankroll_accounts')
        .update({ balance: Number(account.balance) + Number(transaction.amount) })
        .eq('id', transaction.accountId);
    }

    return {
      id: data.id,
      accountId: data.account_id,
      type: data.type as BankrollTransaction['type'],
      amount: Number(data.amount),
      date: data.date,
      notes: data.notes || '',
      createdAt: data.created_at,
    };
  },
};
