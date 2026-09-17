import React from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
  accent: 'bg-[var(--color-accent)] text-white',
  success: 'bg-[var(--color-success)] text-white',
  warning: 'bg-[var(--color-warning)] text-white',
  danger: 'bg-[var(--color-danger)] text-white',
  neutral: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center font-medium rounded-full',
        size === 'sm' ? 'text-[11px] px-2 py-0.5 min-w-[18px]' : 'text-[13px] px-2.5 py-1 min-w-[22px]',
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
