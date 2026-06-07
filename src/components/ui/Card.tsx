'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({
  children,
  className,
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={cn(
        styles.card,
        hover && styles.hoverable,
        padding !== 'none' && styles[`padding_${padding}`],
        className
      )}
    >
      {children}
    </div>
  );
}
