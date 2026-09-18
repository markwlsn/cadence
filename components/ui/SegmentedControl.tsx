'use client';

import React from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Apple-standard Segmented Control:
 * High-precision segmented slider with track inset, rounded indicator, and crisp typography.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
  size = 'md',
  fullWidth = true,
  className = '',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';
  const heightClass = isSm ? 'h-8' : 'h-10';
  const textClass = isSm ? 'text-[12px] sm:text-[13px]' : 'text-[13px] sm:text-[14px]';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? name}
      className={[
        'p-1 rounded-[10px] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] select-none',
        'flex items-center gap-1',
        fullWidth ? 'w-full' : 'inline-flex',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <label
            key={option.value}
            className={[
              'relative flex-1 flex items-center justify-center gap-2 cursor-pointer select-none',
              'rounded-[7px] px-3 transition-all duration-150 ease-out',
              heightClass,
              textClass,
              'whitespace-nowrap font-medium',
              isSelected
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/40',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon && <span className="text-[1.1em] leading-none shrink-0">{option.icon}</span>}
            <span className="truncate">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
