'use client';

import React, { useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside when open
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Sheet'}
        className={`bottom-sheet-panel ${isOpen ? 'is-open' : ''}`}
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full bg-[var(--color-border-strong)]"
            aria-hidden="true"
          />
        </div>
        {title && (
          <div className="px-6 pb-3 pt-2 border-b border-[var(--color-border)]">
            <h2 className="text-[17px] font-semibold text-[var(--color-text)] text-center">
              {title}
            </h2>
          </div>
        )}
        <div className="p-6">{children}</div>
        {/* Safe area bottom padding */}
        <div className="pb-[env(safe-area-inset-bottom,16px)]" aria-hidden="true" />
      </div>
    </>
  );
}
