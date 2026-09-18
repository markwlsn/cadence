'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDeck, archiveDeck } from '@/lib/data';
import { Button } from '@/components/ui';

interface Props {
  deckId: string;
  deckTitle: string;
  isArchived: boolean;
}

export default function DeckManageActions({ deckId, deckTitle, isArchived: initialArchived }: Props) {
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(initialArchived);
  const [loading, setLoading] = useState(false);

  const handleToggleArchive = async () => {
    setLoading(true);
    try {
      const updated = await archiveDeck(deckId, !isArchived);
      setIsArchived(Boolean(updated.isArchived));
      router.refresh();
    } catch {
      alert('Failed to update archive status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${deckTitle}" and all its flashcards? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await deleteDeck(deckId);
      router.push('/');
    } catch {
      alert('Failed to delete deck. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleToggleArchive}
        className="px-3 py-1.5 text-[13px] font-semibold rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="m10 12 2 2 2-2" />
        </svg>
        {isArchived ? 'Unarchive' : 'Archive'}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={handleDelete}
        className="px-3 py-1.5 text-[13px] font-semibold rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)]/30 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  );
}
