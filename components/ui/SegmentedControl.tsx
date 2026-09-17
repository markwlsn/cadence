'use client';

import React from 'react';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
  size = 'md',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const paddingClass = size === 'sm' ? 'p-0.5' : 'p-1';
  const textClass = size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? name}
      className={[
        'inline-flex items-center',
        'bg-[var(--color-surface)] rounded-[var(--radius-md)]',
        paddingClass,
      ].join(' ')}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
            className={[
              'relative flex-1 flex items-center justify-center cursor-pointer select-none',
              'rounded-[calc(var(--radius-md)-2px)]',
              'px-4',
              size === 'sm' ? 'h-7' : 'h-8',
              textClass,
              'font-medium',
              'transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
              isSelected
                ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
