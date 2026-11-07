'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useI18n } from '@/i18n';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { formatCurrency } from '@/lib/utils';
import styles from '@/app/bankroll/page.module.css';
import localStyles from './SyncBalancesModal.module.css';

interface SyncBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SyncBalancesModal — Awaits atomic RPC adjustments sequentially so live room balances
 * reconcile cleanly without race conditions.
 */
export function SyncBalancesModal({ isOpen, onClose }: SyncBalancesModalProps) {
  const { t, formatMessage } = useI18n();
  const accounts = useBankrollStore((s) => s.accounts);
  const addTransaction = useBankrollStore((s) => s.addTransaction);
  const settings = useSettingsStore((s) => s.settings);
  const defaultCurrency = settings?.currency || 'EUR';
  const { toast } = useToast();

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const platformAccounts = accounts.filter((a) => a.category === 'poker_room');

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      platformAccounts.forEach((acc) => {
        initial[acc.id] = acc.balance.toString();
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBalances(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    let syncedCount = 0;

    try {
      const nowIso = new Date().toISOString();
      for (const acc of platformAccounts) {
        const newValStr = balances[acc.id];
        if (newValStr === undefined || newValStr === '') continue;

        const newBalance = parseFloat(newValStr);
        if (isNaN(newBalance) || newBalance < 0) continue;

        const delta = Math.round((newBalance - acc.balance) * 100) / 100;
        if (Math.abs(delta) > 0.001) {
          await addTransaction({
            accountId: acc.id,
            type: 'session_result',
            amount: delta,
            date: nowIso,
            notes: 'Quick sync',
          });
          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        toast.success(formatMessage('syncModal.syncedToast', { count: syncedCount }));
      }
      onClose();
    } catch (err) {
      console.error('Quick sync failed:', err);
      toast.error(t.syncModal.syncErrorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = platformAccounts.some((acc) => {
    const newVal = parseFloat(balances[acc.id]);
    return !isNaN(newVal) && newVal >= 0 && Math.abs(newVal - acc.balance) > 0.001;
  });

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={t.syncModal.title}>
      <form onSubmit={handleSubmit} className={localStyles.form}>
        <p className={localStyles.description}>{t.syncModal.description}</p>

        <div className={localStyles.accountList}>
          {platformAccounts.length === 0 ? (
            <p className={localStyles.empty}>{t.syncModal.empty}</p>
          ) : (
            platformAccounts.map((acc) => {
              const currentVal = balances[acc.id] ?? '';
              const diff = parseFloat(currentVal) - acc.balance;
              const diffNum = isNaN(diff) ? 0 : Math.round(diff * 100) / 100;
              const accCurrency = acc.currency || defaultCurrency;

              return (
                <div key={acc.id} className={localStyles.accountRow}>
                  <div className={localStyles.accountInfo}>
                    <span className={localStyles.accountName}>{acc.name}</span>
                    <span className={localStyles.oldBalance}>
                      {t.syncModal.was} {formatCurrency(acc.balance, accCurrency)}
                    </span>
                  </div>

                  <div className={localStyles.inputWrap}>
                    <span className={localStyles.currencySymbol}>
                      {accCurrency === 'USD' ? '$' : accCurrency === 'EUR' ? '€' : '£'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isSubmitting}
                      className={localStyles.balanceInput}
                      value={currentVal}
                      onChange={(e) =>
                        setBalances((prev) => ({ ...prev, [acc.id]: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {diffNum !== 0 && (
                    <div
                      className={`${localStyles.diff} ${
                        diffNum > 0 ? localStyles.diffPos : localStyles.diffNeg
                      }`}
                    >
                      {formatCurrency(diffNum, accCurrency, true)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.formActions} style={{ marginTop: '24px' }}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.syncModal.cancel}
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!hasChanges || isSubmitting}
          >
            {isSubmitting ? <Loader2 size={16} /> : <RefreshCw size={16} />}
            {isSubmitting ? t.syncModal.syncing : t.syncModal.syncBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
