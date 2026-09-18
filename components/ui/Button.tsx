'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]',
    'hover:bg-[var(--color-btn-primary-hover)]',
    'active:scale-[0.98]',
    'shadow-[var(--shadow-sm)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  secondary: [
    'bg-[var(--color-btn-secondary-bg)] text-[var(--color-btn-secondary-text)]',
    'border border-[var(--color-btn-secondary-border)]',
    'hover:bg-[var(--color-btn-secondary-hover)]',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text)]',
    'hover:bg-[var(--color-surface-overlay)]',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  danger: [
    'bg-[var(--color-danger)] text-white',
    'hover:opacity-90',
    'active:scale-[0.98]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] font-medium rounded-[var(--radius-sm)] gap-1.5',
  md: 'h-11 px-5 text-[15px] font-semibold rounded-[var(--radius-md)] gap-2',
  lg: 'h-14 px-7 text-[17px] font-semibold rounded-[var(--radius-lg)] gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
        'select-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === 'sm' ? 14 : 16} />
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
