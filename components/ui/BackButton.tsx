'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
}

export function BackButton({
  href,
  label = 'Back',
  className = '',
  ariaLabel,
}: BackButtonProps) {
  const router = useRouter();

  const content = (
    <>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="font-medium text-[14px]">{label}</span>
    </>
  );

  const baseStyles =
    'group inline-flex items-center gap-1.5 px-3 py-2 -ml-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] active:scale-95 transition-all min-h-[44px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel || label}
        className={`${baseStyles} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={ariaLabel || label}
      className={`${baseStyles} ${className}`}
    >
      {content}
    </button>
  );
}
