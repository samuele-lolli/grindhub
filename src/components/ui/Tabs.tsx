'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
}: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (variant !== 'underline') return;
    const container = containerRef.current;
    if (!container) return;

    const activeEl = container.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeTab}"]`
    );
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab, variant, tabs]);

  return (
    <div
      ref={containerRef}
      className={cn(styles.tabs, styles[variant])}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            styles.tab,
            activeTab === tab.id && styles.active
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
      {variant === 'underline' && (
        <div className={styles.indicator} style={indicatorStyle} />
      )}
    </div>
  );
}
