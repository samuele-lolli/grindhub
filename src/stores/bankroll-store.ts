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
  updateAccountBalance: (id: string, amount: number) => void; // local optimistic
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

  addAccount: async (acc) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newAcc = await bankrollService.createAccount(userId, acc);
    set(state => ({
      accounts: [...state.accounts, newAcc]
    }));

    if (acc.balance > 0) {
      await get().addTransaction({
        accountId: newAcc.id,
        type: 'deposit',
        amount: acc.balance,
        date: new Date().toISOString(),
        notes: 'Initial Balance'
      });
    }
  },

  updateAccountBalance: (id, amount) => set(state => ({
    accounts: state.accounts.map(a => a.id === id ? { ...a, balance: a.balance + amount, updatedAt: new Date().toISOString() } : a)
  })),

  deleteAccount: async (id) => {
    await bankrollService.deleteAccount(id);
    set(state => ({
      accounts: state.accounts.filter(a => a.id !== id),
      transactions: state.transactions.filter(t => t.accountId !== id)
    }));
  },

  addTransaction: async (tx) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newTx = await bankrollService.createTransaction(userId, tx);
    set(state => ({
      transactions: [newTx, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }));
    // Update local account balance optimistically
    const multiplier = tx.type === 'deposit' ? 1 : -1;
    get().updateAccountBalance(tx.accountId, tx.amount * multiplier);
  },

  deleteTransaction: async (id) => {
    const tx = get().transactions.find(t => t.id === id);
    if (tx) {
      const multiplier = tx.type === 'deposit' ? -1 : 1;
      get().updateAccountBalance(tx.accountId, tx.amount * multiplier);
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id)
      }));
    }
  },

  transferFunds: async (fromAccountId, toAccountId, amount, notes = 'Transfer') => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const date = new Date().toISOString();
    const fromName = get().accounts.find(a => a.id === fromAccountId)?.name || 'Account';
    const toName = get().accounts.find(a => a.id === toAccountId)?.name || 'Account';
    
    await get().addTransaction({ accountId: fromAccountId, type: 'withdrawal', amount, date, notes: `${notes} (To ${toName})` });
    await get().addTransaction({ accountId: toAccountId, type: 'deposit', amount, date, notes: `${notes} (From ${fromName})` });
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
