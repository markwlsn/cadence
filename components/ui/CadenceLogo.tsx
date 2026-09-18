'use client';

import React from 'react';

interface CadenceLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'badge' | 'glyph';
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 60,
};

/**
 * Apple-style minimalist Cadence mark:
 * An elegant geometric rhythm-wave monogram forming a harmonious 'C' and resonance focal point.
 */
export function CadenceLogo({
  size = 'md',
  variant = 'badge',
  className = '',
  showText = false,
}: CadenceLogoProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 36;
  const iconSize = variant === 'badge' ? Math.round(pixelSize * 0.58) : pixelSize;

  const glyph = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform"
      aria-hidden="true"
    >
      {/* Outer Cadence Arc */}
      <path
        d="M18.8 7.6C17.5 4.8 14.9 3.2 12 3.2C7.14 3.2 3.2 7.14 3.2 12C3.2 16.86 7.14 20.8 12 20.8C14.9 20.8 17.5 19.2 18.8 16.4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Inner Resonance Arc */}
      <path
        d="M14.5 9.2C13.8 8.1 12.9 7.6 12 7.6C9.57 7.6 7.6 9.57 7.6 12C7.6 14.43 9.57 16.4 12 16.4C12.9 16.4 13.8 15.9 14.5 14.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Central Rhythm Focus */}
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );

  if (variant === 'glyph') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <div className="text-[var(--color-text)] flex items-center justify-center">
          {glyph}
        </div>
        {showText && (
          <span className="font-bold tracking-tight text-[var(--color-text)] leading-none text-[1.15em]">
            Cadence
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="rounded-[26%] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] flex items-center justify-center shadow-[var(--shadow-sm)] shrink-0 transition-all"
      >
        {glyph}
      </div>
      {showText && (
        <span className="font-bold tracking-tight text-[var(--color-text)] leading-none text-[1.15em]">
          Cadence
        </span>
      )}
    </div>
  );
}
