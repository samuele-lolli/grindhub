'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useBankrollStore } from '@/stores/bankroll-store';
import { Modal } from './Modal';
import { formatCurrency } from '@/lib/utils';
import styles from '@/app/bankroll/page.module.css'; // Reusing some form styles
import localStyles from './SyncBalancesModal.module.css';

interface SyncBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SyncBalancesModal allows quick updating of poker room balances at the end of a session.
 */
export function SyncBalancesModal({ isOpen, onClose }: SyncBalancesModalProps) {
  const accounts = useBankrollStore((s) => s.accounts);
  const addTransaction = useBankrollStore((s) => s.addTransaction);

  const [balances, setBalances] = useState<Record<string, string>>({});

  // Only show poker_room accounts for quick sync
  const platformAccounts = accounts.filter(
    (a) => a.category === 'poker_room'
  );

  // Initialize input state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      platformAccounts.forEach((acc) => {
        initial[acc.id] = acc.balance.toString();
      });
      setBalances(initial);
    }
  }, [isOpen, accounts]); // intentionally not including platformAccounts to avoid infinite loops

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    platformAccounts.forEach((acc) => {
      const newValStr = balances[acc.id];
      if (!newValStr) return;

      const newBalance = parseFloat(newValStr);
      if (isNaN(newBalance)) return;

      const delta = newBalance - acc.balance;
      
      // If balance changed, create a transaction to sync it
      if (Math.abs(delta) > 0.001) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx: any = {
          accountId: acc.id,
          type: 'session_result',
          amount: delta,
          date: new Date().toISOString(),
          notes: 'Quick sync',
        };
        addTransaction(tx);
      }
    });

    onClose();
  };

  const hasChanges = platformAccounts.some((acc) => {
    const newVal = parseFloat(balances[acc.id]);
    return !isNaN(newVal) && Math.abs(newVal - acc.balance) > 0.001;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Sync Balances">
      <form onSubmit={handleSubmit} className={localStyles.form}>
        <p className={localStyles.description}>
          Update your current balances below. GrindHub will automatically calculate the profit/loss and log the transactions.
        </p>

        <div className={localStyles.accountList}>
          {platformAccounts.length === 0 ? (
            <p className={localStyles.empty}>No playing accounts found.</p>
          ) : (
            platformAccounts.map((acc) => {
              const currentVal = balances[acc.id] || '';
              const diff = parseFloat(currentVal) - acc.balance;
              const diffStr = isNaN(diff) ? 0 : diff;
              
              return (
                <div key={acc.id} className={localStyles.accountRow}>
                  <div className={localStyles.accountInfo}>
                    <span className={localStyles.accountName}>{acc.name}</span>
                    <span className={localStyles.oldBalance}>
                      was {formatCurrency(acc.balance, acc.currency)}
                    </span>
                  </div>
                  
                  <div className={localStyles.inputWrap}>
                    <span className={localStyles.currencySymbol}>
                      {acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '£'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={localStyles.balanceInput}
                      value={balances[acc.id] || ''}
                      onChange={(e) => setBalances((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  {diffStr !== 0 && (
                    <div className={`${localStyles.diff} ${diffStr > 0 ? localStyles.diffPos : localStyles.diffNeg}`}>
                      {diffStr > 0 ? '+' : ''}{formatCurrency(diffStr, acc.currency)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.formActions} style={{ marginTop: '24px' }}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!hasChanges}>
            <RefreshCw size={16} />
            Sync Balances
          </button>
        </div>
      </form>
    </Modal>
  );
}
