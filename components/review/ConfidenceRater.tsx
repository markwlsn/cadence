'use client';

import React from 'react';

interface ConfidenceRaterProps {
  value?: 1 | 2 | 3 | 4 | 5;
  onSelect: (rating: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

const levels: { level: 1 | 2 | 3 | 4 | 5; label: string; desc: string }[] = [
  { level: 1, label: '1', desc: 'No clue' },
  { level: 2, label: '2', desc: 'Vague' },
  { level: 3, label: '3', desc: 'Unsure' },
  { level: 4, label: '4', desc: 'Likely' },
  { level: 5, label: '5', desc: 'Certain' },
];

export function ConfidenceRater({
  value,
  onSelect,
  disabled = false,
}: ConfidenceRaterProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto">
      <span className="text-[13px] font-medium tracking-wide text-[var(--color-text-secondary)] uppercase">
        How well do you know this?
      </span>
      <div
        role="radiogroup"
        aria-label="Confidence level before answer"
        className="flex items-center justify-between w-full gap-2"
      >
        {levels.map(({ level, label, desc }) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Confidence ${level} out of 5: ${desc}`}
              disabled={disabled}
              onClick={() => onSelect(level)}
              className={[
                'flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-[var(--radius-md)]',
                'border transition-all duration-[var(--duration-fast)] select-none min-h-[52px]',
                'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-[var(--shadow-sm)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-overlay)]',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span className="text-[16px] font-semibold leading-tight">{label}</span>
              <span
                className={`text-[10px] mt-0.5 leading-tight ${
                  isSelected ? 'text-white/80' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
