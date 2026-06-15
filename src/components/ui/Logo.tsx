import React from 'react';

/**
 * GRINDOS brand mark — a hexagon badge enclosing a geometric "S".
 *
 * Rendered as inline SVG so it scales crisply and inherits its colour from
 * the surrounding `color` (uses `currentColor`). Set the colour on the parent,
 * e.g. `style={{ color: 'var(--accent-green)' }}`.
 *
 * @param size - Width/height in pixels. Defaults to 32.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="GRINDOS"
    >
      {/* Hexagon badge */}
      <path
        d="M16 2 L29 9.5 L29 22.5 L16 30 L3 22.5 L3 9.5 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="rgba(0, 194, 122, 0.10)"
      />
      {/* Geometric S */}
      <path
        d="M20.5 10.5 H12 V15.5 H20 V21.5 H11.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
