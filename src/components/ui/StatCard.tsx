'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './StatCard.module.css';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: 'green' | 'red' | 'blue' | 'gold' | 'purple';
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;
  const isPositive = (trend ?? 0) >= 0;

  return (
    <div className={cn(styles.card, styles[`color_${color}`])}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && <div className={cn(styles.iconWrap, styles[`iconBg_${color}`])}>{icon}</div>}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.footer}>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {hasTrend && (
          <span className={cn(styles.trend, isPositive ? styles.trendUp : styles.trendDown)}>
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(trend!).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
