'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import dynamic from 'next/dynamic';

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
import { Wallet, Shield, Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, CreditCard, X, Building2, Coins } from 'lucide-react';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSessionStore } from '@/stores/session-store';
import { SyncBalancesModal } from '@/components/ui/SyncBalancesModal';
import { useI18n } from '@/i18n';
import { format } from 'date-fns';
import {
  formatCurrency, formatDate, getBankrollHealth, cn
} from '@/lib/utils';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import type { Platform, BankrollCategory } from '@/types';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);



const categoryIcons: Record<string, React.ReactNode> = {
  poker_room: <Coins size={16} />,
  e_wallet: <Wallet size={16} />,
  bank_account: <Building2 size={16} />,
  cash: <CreditCard size={16} />
};

/**
 * BankrollPage — Bankroll management hub.
 * Renders account balances, health status, bankroll history chart, portfolio allocation donut,
 * recent transactions, and modals for deposits, withdrawals, transfers, and new accounts.
 */
export default function BankrollPage() {
  const { t } = useI18n();
  const accounts = useBankrollStore(s => s.accounts);
  const transactions = useBankrollStore(s => s.transactions);
  const addTransaction = useBankrollStore(s => s.addTransaction);
  const deleteTransaction = useBankrollStore(s => s.deleteTransaction);
  const transferFunds = useBankrollStore(s => s.transferFunds);
  const addAccount = useBankrollStore(s => s.addAccount);
  const deleteAccount = useBankrollStore(s => s.deleteAccount);

  const getStats = useSessionStore(s => s.getStats);
  const sessions = useSessionStore(s => s.sessions);
  const stats = useMemo(() => getStats(), [getStats]);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Forms
  const [txForm, setTxForm] = useState({ type: 'deposit' as 'deposit'|'withdrawal', amount: '', accountId: '', notes: '' });
  const [accForm, setAccForm] = useState({ platform: 'pokerstars' as Platform, name: '', balance: '', category: 'poker_room' as BankrollCategory });
  const [transferForm, setTransferForm] = useState({ fromId: '', toId: '', amount: '', notes: '' });

  const playableBankroll = useMemo(() => accounts.filter(a => a.category === 'poker_room').reduce((sum, a) => sum + a.balance, 0), [accounts]);
  const totalPortfolio = useMemo(() => accounts.reduce((sum, a) => sum + a.balance, 0), [accounts]);
  const health = useMemo(() => getBankrollHealth(playableBankroll, stats.avgBuyIn, 'mtt'), [playableBankroll, stats.avgBuyIn]);

  const healthColors: Record<string, string> = { healthy: 'var(--accent-green)', caution: 'var(--accent-gold)', danger: 'var(--accent-red)' };
  const healthLabels: Record<string, string> = { healthy: 'Healthy', caution: 'Caution', danger: 'Under-rolled' };
  const healthDesc: Record<string, string> = {
    healthy: 'Your bankroll is sufficient for your average buy-in.',
    caution: 'Your bankroll is getting low for your average buy-in. Consider dropping stakes.',
    danger: 'Your bankroll is critically low. Strict bankroll management required.'
  };

  // M2: Escape key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTxModal(false);
        setShowAccModal(false);
        setShowTransferModal(false);
        setShowSyncModal(false);
      }
    };
    if (showTxModal || showAccModal || showTransferModal || showSyncModal) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showTxModal, showAccModal, showTransferModal, showSyncModal]);

  // Chart data
  const chartData = useMemo(() => {
    const playableAccountIds = new Set(accounts.filter(a => a.category === 'poker_room').map(a => a.id));
    const events: { date: Date; amount: number }[] = [];
    // We only use transactions to trace bankroll backwards. Sessions don't mutate DB bankroll.
    transactions.forEach(tx => {
      if (playableAccountIds.has(tx.accountId)) {
        let delta = 0;
        if (tx.type === 'withdrawal') {
          delta = -tx.amount;
        } else {
          delta = tx.amount; // deposit, session_result, transfer
        }
        events.push({ date: new Date(tx.date), amount: delta });
      }
    });
    
    const sortedEvents = events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const byDay = new Map<string, number>();
    
    if (sortedEvents.length > 0) {
      const dayChanges = new Map<string, number>();
      sortedEvents.forEach(e => {
        const key = format(e.date, 'yyyy-MM-dd');
        dayChanges.set(key, (dayChanges.get(key) || 0) + e.amount);
      });

      const startDateStr = format(sortedEvents[0].date, 'yyyy-MM-dd');
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const allDays: string[] = [];
      const startD = new Date(startDateStr + 'T12:00:00Z');
      const todayD = new Date(todayStr + 'T12:00:00Z');
      const totalDays = Math.ceil((todayD.getTime() - startD.getTime()) / 86400000) + 1;
      for (let i = 0; i < Math.min(totalDays, 3650); i++) {
        const d = new Date(startD.getTime() + i * 86400000);
        allDays.push(d.toISOString().split('T')[0]);
      }
      
      let runningBankroll = playableBankroll;
      
      for (let i = allDays.length - 1; i >= 0; i--) {
        const key = allDays[i];
        byDay.set(key, runningBankroll);
        
        if (dayChanges.has(key)) {
          runningBankroll -= dayChanges.get(key)!;
        }
      }
      if (!byDay.has(format(new Date(), 'yyyy-MM-dd'))) {
        byDay.set(format(new Date(), 'yyyy-MM-dd'), playableBankroll);
      }
    } else {
       byDay.set(format(new Date(), 'yyyy-MM-dd'), playableBankroll);
    }

    const chronologicalDays = Array.from(byDay.keys()).sort();

    return {
      labels: chronologicalDays.map(d => { const parts = d.split('-'); return `${parts[1]}/${parts[2]}`; }),
      datasets: [{
        data: chronologicalDays.map(d => byDay.get(d)!),
        borderColor: '#10b981',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(16,185,129,0.1)';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(16,185,129,0.25)');
          gradient.addColorStop(1, 'rgba(16,185,129,0)');
          return gradient;
        },
        fill: true, cubicInterpolationMode: 'monotone' as const, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
      }],
    };
  }, [transactions, playableBankroll, accounts]);

  const donutData = useMemo(() => {
    const data = accounts.filter(a => a.balance > 0);
    return {
      labels: data.map(a => a.name),
      datasets: [{
        data: data.map(a => a.balance),
        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4'],
        borderWidth: 0, hoverOffset: 4,
      }]
    };
  }, [accounts]);

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.accountId) return;
    addTransaction({
      type: txForm.type,
      amount: parseFloat(txForm.amount),
      accountId: txForm.accountId,
      date: new Date().toISOString(),
      notes: txForm.notes
    });
    setShowTxModal(false);
    setTxForm({ type: 'deposit', amount: '', accountId: '', notes: '' });
  };

  const handleAddAcc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.balance || !accForm.name) return;
    addAccount({
      platform: accForm.platform,
      name: accForm.name,
      balance: parseFloat(accForm.balance),
      currency: 'EUR',
      category: accForm.category
    });
    setShowAccModal(false);
    setAccForm({ platform: 'pokerstars', name: '', balance: '', category: 'poker_room' });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.amount || !transferForm.fromId || !transferForm.toId || transferForm.fromId === transferForm.toId) return;
    transferFunds(transferForm.fromId, transferForm.toId, parseFloat(transferForm.amount), transferForm.notes);
    setShowTransferModal(false);
    setTransferForm({ fromId: '', toId: '', amount: '', notes: '' });
  };

  const [visibleTxCount, setVisibleTxCount] = useState(5);
  const sortedTx = useMemo(() => [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [transactions]);
  const visibleTx = useMemo(() => sortedTx.slice(0, visibleTxCount), [sortedTx, visibleTxCount]);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 12, displayColors: false, callbacks: { label: (ctx:any) => formatCurrency(ctx.raw, 'EUR') } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', maxTicksLimit: 12, maxRotation: 45 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: (v:any) => `€${v}` } } }
  };

  return (
    <>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t.bankroll.title}</h1>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.heroLabel}>Playable Bankroll</span>
              <span className={styles.healthBadge} style={{ color: healthColors[health], borderColor: healthColors[health] }}>
                <Shield size={14} /> {healthLabels[health]}
              </span>
            </div>
            <div className={styles.heroValueWrap} style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={styles.heroValue}>{formatCurrency(playableBankroll, 'EUR')}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.25rem' }}>
                Total Portfolio (including wallets/banks): {formatCurrency(totalPortfolio, 'EUR')}
              </span>
            </div>
            <p className={styles.healthDesc}>{healthDesc[health]}</p>
          </div>

          <div className={styles.actionsCard}>
            <h3 className={styles.actionsTitle}>Quick Actions</h3>
            <div className={styles.actionsGrid}>
              <button className={styles.actionBtn} onClick={() => setShowSyncModal(true)}>
                <div className={cn(styles.actionIcon, styles.iconPurple)}><ArrowRightLeft size={20} /></div>
                <span>Quick Sync <UITooltip content={t.tooltips?.quickSync || "Instantly fix discrepancies between GrindHub and your real balances."} position="top" /></span>
              </button>
              <button className={styles.actionBtn} onClick={() => { setTxForm(prev => ({...prev, type: 'deposit', accountId: accounts[0]?.id || ''})); setShowTxModal(true); }}>
                <div className={cn(styles.actionIcon, styles.iconGreen)}><ArrowDownRight size={20} /></div>
                <span>Deposit</span>
              </button>
              <button className={styles.actionBtn} onClick={() => { setTxForm(prev => ({...prev, type: 'withdrawal', accountId: accounts[0]?.id || ''})); setShowTxModal(true); }}>
                <div className={cn(styles.actionIcon, styles.iconRed)}><ArrowUpRight size={20} /></div>
                <span>Withdraw</span>
              </button>
              <button className={styles.actionBtn} onClick={() => { setTransferForm(prev => ({...prev, fromId: accounts[0]?.id || '', toId: accounts[1]?.id || ''})); setShowTransferModal(true); }}>
                <div className={cn(styles.actionIcon, styles.iconBlue)}><ArrowRightLeft size={20} /></div>
                <span>Transfer</span>
              </button>
              <button className={styles.actionBtn} onClick={() => setShowAccModal(true)}>
                <div className={cn(styles.actionIcon, styles.iconGold)}><Plus size={20} /></div>
                <span>New Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <h2 className={styles.sectionTitle} style={{marginTop: '2rem', marginBottom: '1rem'}}>Portfolios & Accounts</h2>
        <div className={styles.accountsGrid}>
          {accounts.map(acc => {
            const normalizedCategory = (acc.category as string) === 'wallet' ? 'e_wallet' : (acc.category || 'poker_room');
            const iconCategory = categoryIcons[normalizedCategory as string] ? normalizedCategory : 'poker_room';
            
            return (
              <div key={acc.id} className={styles.accountCard}>
                <div className={styles.accTop}>
                  <div className={cn(styles.accIconWrap, iconCategory === 'poker_room' ? styles.cblue : iconCategory === 'e_wallet' ? styles.cgreen : styles.cgold)}>
                    {categoryIcons[iconCategory as string]}
                  </div>
                  <button className={styles.deleteAccBtn} onClick={() => deleteAccount(acc.id)}><X size={14}/></button>
                </div>
              <div className={styles.accName}>{acc.name}</div>
              <div className={styles.accBalance}>{formatCurrency(acc.balance, acc.currency)}</div>
            </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className={styles.mainGrid}>
          <div className={styles.chartsCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Playable Bankroll History</h3>
              </div>
              <div className={styles.chartWrap}>
                {chartData.datasets[0].data.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Add sessions or deposits to see your bankroll history.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Total Portfolio Allocation</h3>
              <div className={styles.donutWrap}>
                {accounts.filter(a => a.balance > 0).length > 0 ? (
                  <Doughnut data={donutData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: '#94a3b8', usePointStyle: true, padding: 20 } } } }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No funds available.</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Recent Transactions</h3>
              </div>
              <div className={styles.txList}>
                {sortedTx.length === 0 ? (
                  <div className={styles.emptyState}>No transactions found.</div>
                ) : visibleTx.map(tx => {
                  const accName = accounts.find(a => a.id === tx.accountId)?.name || 'Account';
                  const realAmount = tx.type === 'withdrawal' ? -Math.abs(tx.amount) : tx.amount;
                  const isPositive = realAmount > 0;
                  
                  let isTransfer = false;
                  if (tx.notes?.includes('→') || tx.notes?.includes('←')) isTransfer = true;

                  let txLabel = 'Session Result';
                  if (tx.type === 'deposit') txLabel = 'Deposit';
                  if (tx.type === 'withdrawal') txLabel = 'Withdrawal';
                  if (tx.type === 'transfer' || isTransfer) txLabel = 'Transfer';

                  return (
                    <div key={tx.id} className={styles.txRow}>
                      <div className={styles.txLeft}>
                        <div className={cn(styles.txIcon, isPositive ? styles.iconGreen : styles.iconRed, isTransfer ? styles.iconPurple : '')}>
                          {isTransfer ? <ArrowRightLeft size={18} /> : (isPositive ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />)}
                        </div>
                        <div className={styles.txInfo}>
                          <span className={styles.txType}>
                            {txLabel}
                            {isTransfer && (
                              <span style={{ marginLeft: '4px', display: 'inline-flex', verticalAlign: 'middle' }}>
                                <UITooltip content="Internal transfer between your accounts. Doesn't affect total portfolio value." position="top" />
                              </span>
                            )}
                          </span>
                          <span className={styles.txMeta}>
                            {formatDate(tx.date)} · {accName} {tx.notes ? `(${tx.notes})` : ''}
                          </span>
                        </div>
                      </div>
                      <div className={styles.txRight}>
                        <span className={cn(styles.txAmount, isPositive ? styles.cgreen : styles.cred)}>
                          {formatCurrency(realAmount, 'EUR', true)}
                        </span>
                        <button className={styles.deleteTxBtn} onClick={() => deleteTransaction(tx.id)}><X size={16}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {sortedTx.length > visibleTxCount && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button className={styles.actionBtn} style={{ padding: '4px 12px' }} onClick={() => setVisibleTxCount(prev => prev + 5)}>
                    <span>Load More</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Tx Modal */}
      {showTxModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTxModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{txForm.type === 'deposit' ? 'Add Deposit' : 'Add Withdrawal'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowTxModal(false)}><X size={20} /></button>
            </div>
            <form className={styles.form} onSubmit={handleAddTx}>
              <div className={styles.formGroup}>
                <label>Amount (EUR) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max={txForm.type === 'withdrawal' && txForm.accountId ? accounts.find(a => a.id === txForm.accountId)?.balance : undefined}
                  value={txForm.amount} 
                  onChange={e => setTxForm({...txForm, amount: e.target.value})} 
                  placeholder="e.g. 500" 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Account *</label>
                <select value={txForm.accountId} onChange={e => setTxForm({...txForm, accountId: e.target.value})} required>
                  <option value="" disabled>Select an account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Notes</label>
                <input type="text" value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} placeholder="Optional notes" />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowTxModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className={styles.saveBtn}
                  disabled={!!(txForm.type === 'withdrawal' && txForm.accountId && parseFloat(txForm.amount) > (accounts.find(a => a.id === txForm.accountId)?.balance || 0))}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acc Modal */}
      {showAccModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAccModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add New Account</h3>
              <button className={styles.closeBtn} onClick={() => setShowAccModal(false)}><X size={20} /></button>
            </div>
            <form className={styles.form} onSubmit={handleAddAcc}>
              <div className={styles.formGroup}>
                <label>Account Name *</label>
                <input type="text" value={accForm.name} onChange={e => setAccForm({...accForm, name: e.target.value})} placeholder="e.g. PokerStars, Skrill, Main Bank" required />
              </div>
              <div className={styles.formGroup}>
                <label>Category *</label>
                <select value={accForm.category} onChange={e => setAccForm({...accForm, category: e.target.value as BankrollCategory})} required>
                  <option value="poker_room">Poker Room</option>
                  <option value="e_wallet">E-Wallet (Skrill, Neteller)</option>
                  <option value="crypto">Crypto</option>
                  <option value="bank_account">Bank Account (Real Life)</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Initial Balance (EUR) *</label>
                <input type="number" step="0.01" value={accForm.balance} onChange={e => setAccForm({...accForm, balance: e.target.value})} placeholder="0.00" required />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAccModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTransferModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Transfer Funds</h3>
              <button className={styles.closeBtn} onClick={() => setShowTransferModal(false)}><X size={20} /></button>
            </div>
            <form className={styles.form} onSubmit={handleTransfer}>
              <div className={styles.formGroup}>
                <label>From *</label>
                <select value={transferForm.fromId} onChange={e => setTransferForm({...transferForm, fromId: e.target.value})} required>
                  <option value="" disabled>Select origin</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>To *</label>
                <select value={transferForm.toId} onChange={e => setTransferForm({...transferForm, toId: e.target.value})} required>
                  <option value="" disabled>Select destination</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Amount (EUR) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  max={transferForm.fromId ? accounts.find(a => a.id === transferForm.fromId)?.balance : undefined}
                  value={transferForm.amount} 
                  onChange={e => setTransferForm({...transferForm, amount: e.target.value})} 
                  placeholder="0.00" 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notes</label>
                <input type="text" value={transferForm.notes} onChange={e => setTransferForm({...transferForm, notes: e.target.value})} placeholder="e.g. Cashout" />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className={styles.saveBtn}
                  disabled={!!(transferForm.fromId && parseFloat(transferForm.amount) > (accounts.find(a => a.id === transferForm.fromId)?.balance || 0))}
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SyncBalancesModal 
        isOpen={showSyncModal} 
        onClose={() => setShowSyncModal(false)} 
      />
    </>
  );
}
