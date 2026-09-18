'use client';

import React, { useEffect } from 'react';
import type { Rating } from '@/types';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

const ratingConfigs: {
  rating: Rating;
  label: string;
  subtext: string;
  keyHint: string;
}[] = [
  {
    rating: 'again',
    label: 'Again',
    subtext: '< 10m',
    keyHint: '1',
  },
  {
    rating: 'hard',
    label: 'Hard',
    subtext: '1d',
    keyHint: '2',
  },
  {
    rating: 'good',
    label: 'Good',
    subtext: '3d',
    keyHint: '3',
  },
  {
    rating: 'easy',
    label: 'Easy',
    subtext: '7d',
    keyHint: '4',
  },
];

export function RatingButtons({ onRate, disabled = false }: RatingButtonsProps) {
  // Keyboard accessibility: 1, 2, 3, 4 map to Again, Hard, Good, Easy
  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.key === '1') onRate('again');
      else if (e.key === '2') onRate('hard');
      else if (e.key === '3') onRate('good');
      else if (e.key === '4') onRate('easy');
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRate, disabled]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-lg mx-auto">
      {ratingConfigs.map(({ rating, label, subtext, keyHint }) => {
        const isGood = rating === 'good';
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onRate(rating)}
            aria-label={`${label} (${subtext}) - Press ${keyHint}`}
            className={[
              'flex-1 flex flex-col items-center justify-center py-3 px-2',
              'rounded-[var(--radius-md)] border select-none min-h-[64px]',
              'transition-all duration-[var(--duration-fast)] active:scale-95 cursor-pointer',
              'focus-visible:outline-2 focus-visible:outline-[var(--color-text)] focus-visible:outline-offset-2',
              isGood
                ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] border-[var(--color-btn-primary-bg)] hover:bg-[var(--color-btn-primary-hover)] shadow-[var(--shadow-sm)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-overlay)] shadow-[var(--shadow-sm)]',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span className="text-[16px] font-semibold tracking-tight">{label}</span>
            <div
              className={`flex items-center gap-1 mt-0.5 text-[12px] ${
                isGood ? 'opacity-80' : 'text-[var(--color-text-secondary)] opacity-75'
              }`}
            >
              <span>{subtext}</span>
              <span
                className={`hidden sm:inline-block px-1 py-0.2 rounded text-[10px] font-mono ${
                  isGood ? 'bg-white/20 dark:bg-black/20 text-inherit' : 'bg-[var(--color-surface-overlay)]'
                }`}
              >
                {keyHint}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
