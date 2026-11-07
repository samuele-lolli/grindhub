// ============================================================
// GrindHub — Bankroll Store (Zustand)
// All balance mutations go through atomic PostgreSQL RPCs via bankrollService.
// ============================================================

import { create } from 'zustand';
import type { BankrollAccount, BankrollTransaction } from '@/types';
import { bankrollService } from '@/lib/services/bankroll-service';
import { useProfileStore } from './profile-store';
import { useGoalsStore } from './goals-store';

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

function sortTransactionsDesc(txs: BankrollTransaction[]): BankrollTransaction[] {
  return [...txs].sort((a, b) => {
    const d = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (d !== 0) return d;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export const useBankrollStore = create<BankrollStore>()((set, get) => ({
  accounts: [],
  transactions: [],

  /**
   * Creates a new bankroll account.
   * If initial balance > 0, creates the account at 0 and records an atomic
   * "Initial Balance" deposit so historical bankroll charts remain 100% exact.
   */
  addAccount: async (acc) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const initialBalance = acc.balance;
      const accountToCreate = { ...acc, balance: 0 };
      const newAcc = await bankrollService.createAccount(userId, accountToCreate);

      set((state) => ({
        accounts: [...state.accounts, newAcc],
      }));

      if (initialBalance > 0) {
        await get().addTransaction({
          accountId: newAcc.id,
          type: 'deposit',
          amount: initialBalance,
          date: new Date().toISOString(),
          notes: 'Initial Balance',
        });
      }
    } catch (error) {
      console.error('Failed to add bankroll account:', error);
      throw error;
    }
  },

  deleteAccount: async (id) => {
    try {
      await bankrollService.deleteAccount(id);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        transactions: state.transactions.filter((t) => t.accountId !== id),
      }));
      useGoalsStore.getState().evaluateActiveGoals().catch(console.error);
    } catch (error) {
      console.error('Failed to delete bankroll account:', error);
      throw error;
    }
  },

  /**
   * Atomically records a transaction and updates the account balance in PostgreSQL.
   */
  addTransaction: async (tx) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const result = await bankrollService.createTransaction(userId, tx);

      set((state) => ({
        transactions: sortTransactionsDesc([result.transaction, ...state.transactions]),
        accounts: state.accounts.map((a) =>
          a.id === tx.accountId
            ? { ...a, balance: result.newBalance, updatedAt: new Date().toISOString() }
            : a
        ),
      }));

      useGoalsStore.getState().evaluateActiveGoals().catch(console.error);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  },

  /**
   * Deletes a transaction (or both legs of a `[tid:<uuid>]` transfer pair) and
   * reconciles all account balances from the PostgreSQL ledger.
   */
  deleteTransaction: async (id) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) throw new Error('User not authenticated');

    const tx = get().transactions.find((t) => t.id === id);
    if (!tx) return;

    try {
      const { deletedIds, reconciledBalances } = await bankrollService.deleteTransaction(userId, {
        id: tx.id,
        transferGroupId: tx.transferGroupId,
      });

      const deletedSet = new Set(deletedIds);
      const balanceMap = new Map(reconciledBalances.map((r) => [r.id, r.balance]));
      const nowIso = new Date().toISOString();

      set((state) => ({
        transactions: state.transactions.filter((t) => !deletedSet.has(t.id)),
        accounts: state.accounts.map((a) =>
          balanceMap.has(a.id)
            ? { ...a, balance: balanceMap.get(a.id)!, updatedAt: nowIso }
            : a
        ),
      }));

      useGoalsStore.getState().evaluateActiveGoals().catch(console.error);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  },

  /**
   * Atomically transfers funds between two accounts via `record_bankroll_transfer` RPC
   * (`type = 'transfer'`, linked via `[tid:<uuid>]`).
   */
  transferFunds: async (fromAccountId, toAccountId, amount, notes = 'Transfer') => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const date = new Date().toISOString();
      const res = await bankrollService.createTransfer(fromAccountId, toAccountId, amount, date, notes);
      const nowIso = new Date().toISOString();

      set((state) => ({
        transactions: sortTransactionsDesc([res.inTx, res.outTx, ...state.transactions]),
        accounts: state.accounts.map((a) => {
          if (a.id === fromAccountId) return { ...a, balance: res.fromBalance, updatedAt: nowIso };
          if (a.id === toAccountId) return { ...a, balance: res.toBalance, updatedAt: nowIso };
          return a;
        }),
      }));

      useGoalsStore.getState().evaluateActiveGoals().catch(console.error);
    } catch (error) {
      console.error('Failed to transfer funds:', error);
      throw error;
    }
  },

  getTotalBankroll: (excludeRealLife = true) => {
    return get()
      .accounts.filter((a) => (excludeRealLife ? a.category === 'poker_room' : true))
      .reduce((sum, a) => sum + a.balance, 0);
  },

  getAccountBalance: (id) => {
    return get().accounts.find((a) => a.id === id)?.balance || 0;
  },

  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions: sortTransactionsDesc(transactions) }),
}));
