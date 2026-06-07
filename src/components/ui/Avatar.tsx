'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useMemo } from 'react';
import { getInitials, cn } from '@/lib/utils';
import styles from './Avatar.module.css';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
}

/**
 * Generate a deterministic hue from a name string
 * so each user gets a consistent gradient color.
 */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function Avatar({
  name,
  src,
  size = 'md',
  showBorder = false,
}: AvatarProps) {
  const hue = useMemo(() => nameToHue(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  const gradientBg = {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${(hue + 40) % 360}, 70%, 60%) 100%)`,
  };

  return (
    <div
      className={cn(
        styles.avatar,
        styles[`size_${size}`],
        showBorder && styles.bordered
      )}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={styles.image}
          loading="lazy"
        />
      ) : (
        <div className={styles.fallback} style={gradientBg}>
          <span className={styles.initials}>{initials}</span>
        </div>
      )}
    </div>
  );
}
