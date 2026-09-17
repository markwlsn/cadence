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
  colorClass: string;
  keyHint: string;
}[] = [
  {
    rating: 'again',
    label: 'Again',
    subtext: '< 10m',
    colorClass: 'hover:border-[var(--color-rating-again)] text-[var(--color-rating-again)]',
    keyHint: '1',
  },
  {
    rating: 'hard',
    label: 'Hard',
    subtext: '1d',
    colorClass: 'hover:border-[var(--color-rating-hard)] text-[var(--color-rating-hard)]',
    keyHint: '2',
  },
  {
    rating: 'good',
    label: 'Good',
    subtext: '3d',
    colorClass: 'hover:border-[var(--color-rating-good)] text-[var(--color-rating-good)]',
    keyHint: '3',
  },
  {
    rating: 'easy',
    label: 'Easy',
    subtext: '7d',
    colorClass: 'hover:border-[var(--color-rating-easy)] text-[var(--color-rating-easy)]',
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
      {ratingConfigs.map(({ rating, label, subtext, colorClass, keyHint }) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
          aria-label={`${label} (${subtext}) - Press ${keyHint}`}
          className={[
            'flex-1 flex flex-col items-center justify-center py-3 px-2',
            'rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]',
            'shadow-[var(--shadow-sm)] select-none min-h-[64px]',
            'transition-all duration-[var(--duration-fast)] active:scale-95 cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
            colorClass,
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <span className="text-[16px] font-semibold tracking-tight">{label}</span>
          <div className="flex items-center gap-1 mt-0.5 text-[12px] opacity-75 text-[var(--color-text-secondary)]">
            <span>{subtext}</span>
            <span className="hidden sm:inline-block px-1 py-0.2 bg-[var(--color-surface-overlay)] rounded text-[10px] font-mono">
              {keyHint}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
