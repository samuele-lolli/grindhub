// ============================================================
// GrindHub — Bankroll Store (Zustand)
// All balance logic is handled by bankrollService (single source of truth).
// The store only updates local state to match what the service returns.
// ============================================================

import { create } from 'zustand';
import type { BankrollAccount, BankrollTransaction } from '@/types';
import { bankrollService } from '@/lib/services/bankroll-service';
import { useProfileStore } from './profile-store';

interface BankrollState {
  accounts: BankrollAccount[];
  transactions: BankrollTransaction[];
}

interface BankrollActions {
  addAccount: (account: Omit<BankrollAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addTransaction: (transaction: Omit<BankrollTransaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => Promise<void>;

  getTotalBankroll: (excludeRealLife?: boolean) => number;
  getAccountBalance: (id: string) => number;

  setAccounts: (accounts: BankrollAccount[]) => void;
  setTransactions: (transactions: BankrollTransaction[]) => void;
}

type BankrollStore = BankrollState & BankrollActions;

export const useBankrollStore = create<BankrollStore>()((set, get) => ({
  accounts: [],
  transactions: [],

  /**
   * Creates a new bankroll account.
   * If the initial balance > 0, the service already stores balance in the DB.
   * We do NOT create an extra "Initial Balance" transaction to avoid double-counting.
   */
  addAccount: async (acc) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newAcc = await bankrollService.createAccount(userId, acc);
    set(state => ({
      accounts: [...state.accounts, newAcc]
    }));
  },

  deleteAccount: async (id) => {
    await bankrollService.deleteAccount(id);
    set(state => ({
      accounts: state.accounts.filter(a => a.id !== id),
      transactions: state.transactions.filter(t => t.accountId !== id)
    }));
  },

  /**
   * Adds a transaction. The service handles BOTH:
   * 1. Inserting the transaction row in DB
   * 2. Updating the account balance in DB (sign-aware)
   *
   * We then sync local state with the returned values.
   * NO local optimistic balance update — single source of truth.
   */
  addTransaction: async (tx) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const result = await bankrollService.createTransaction(userId, tx);

    set(state => ({
      // Add the new transaction to local state
      transactions: [result.transaction, ...state.transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      // Sync the account balance with what the DB says
      accounts: state.accounts.map(a =>
        a.id === tx.accountId
          ? { ...a, balance: result.newBalance, updatedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  /**
   * Deletes a transaction and reverses its balance effect in the DB.
   * The service handles the DB deletion and balance reversal.
   */
  deleteTransaction: async (id) => {
    const tx = get().transactions.find(t => t.id === id);
    if (!tx) return;

    const newBalance = await bankrollService.deleteTransaction({
      id: tx.id,
      accountId: tx.accountId,
      type: tx.type,
      amount: tx.amount,
    });

    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
      accounts: state.accounts.map(a =>
        a.id === tx.accountId
          ? { ...a, balance: newBalance, updatedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  /**
   * Transfers funds between two accounts.
   * Creates a withdrawal from source + deposit to destination.
   * Each addTransaction call handles its own balance update correctly.
   */
  transferFunds: async (fromAccountId, toAccountId, amount, notes = 'Transfer') => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const fromName = get().accounts.find(a => a.id === fromAccountId)?.name || 'Account';
    const toName = get().accounts.find(a => a.id === toAccountId)?.name || 'Account';
    const date = new Date().toISOString();

    // Withdraw from source
    await get().addTransaction({
      accountId: fromAccountId,
      type: 'withdrawal',
      amount,
      date,
      notes: `${notes} → ${toName}`
    });

    // Deposit to destination
    await get().addTransaction({
      accountId: toAccountId,
      type: 'deposit',
      amount,
      date,
      notes: `${notes} ← ${fromName}`
    });
  },

  getTotalBankroll: (excludeRealLife = true) => {
    return get().accounts
      .filter(a => excludeRealLife ? a.category !== 'bank_account' && a.category !== 'cash' : true)
      .reduce((sum, a) => sum + a.balance, 0);
  },

  getAccountBalance: (id) => {
    return get().accounts.find(a => a.id === id)?.balance || 0;
  },

  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions })
}));
