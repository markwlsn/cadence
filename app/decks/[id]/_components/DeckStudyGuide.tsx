'use client';

import React, { useState } from 'react';
import type { Card } from '@/types';
import { Button } from '@/components/ui';
import { cleanOptionDisplay, cleanQuestionDisplay } from '@/lib/assessments';

interface Props {
  deckTitle: string;
  cards: Card[];
  deckId: string;
}

export default function DeckStudyGuide({ deckTitle, cards, deckId }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCards = cards.filter((c) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      c.front.toLowerCase().includes(query) ||
      c.back.toLowerCase().includes(query) ||
      (c.explanation && c.explanation.toLowerCase().includes(query))
    );
  });

  const terminologyCards = filteredCards.filter((c) => c.type === 'basic' || c.type === 'cloze');
  const applicationCards = filteredCards.filter((c) => c.type === 'mcq');

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Search & Print Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] print:hidden">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search key terms, definitions, or principles…"
            className="w-full px-3.5 py-2 pl-9 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-text)] transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
            Showing {filteredCards.length} of {cards.length} items
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="text-[13px] font-semibold shrink-0"
          >
            Print Study Sheet 🖨️
          </Button>
        </div>
      </div>

      {/* ── Printable Header (Appears only on print) ── */}
      <div className="hidden print:block border-b border-black pb-4 mb-6">
        <h1 className="text-[24px] font-bold text-black">{deckTitle} — High-Yield Review Sheet</h1>
        <p className="text-[12px] text-zinc-600">
          Generated via Cadence AI Reviewer · {cards.length} Core Concepts &amp; Examination Items
        </p>
      </div>

      {/* ── Section 1: Core Terminology & Fundamental Principles ── */}
      {terminologyCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)] bg-[var(--color-surface-overlay)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              Part I
            </span>
            <h3 className="text-[16px] font-bold text-[var(--color-text)]">
              Core Terminology &amp; Key Definitions ({terminologyCards.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {terminologyCards.map((card, idx) => (
              <div
                key={card.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1.5 break-inside-avoid print:bg-white print:border-zinc-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[14px] font-bold text-[var(--color-text)]">
                    {idx + 1}. {card.front}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] shrink-0 print:hidden">
                    {card.type}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed pl-4 border-l-2 border-[var(--color-text)]">
                  {card.back}
                </p>
                {card.explanation && (
                  <p className="text-[12px] text-[var(--color-text-tertiary)] italic pl-4">
                    Context: {card.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Applied Conceptual Distinctions & Scenarios ── */}
      {applicationCards.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)] bg-[var(--color-surface-overlay)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              Part II
            </span>
            <h3 className="text-[16px] font-bold text-[var(--color-text)]">
              Conceptual Distinctions &amp; Case Applications ({applicationCards.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {applicationCards.map((card, idx) => (
              <div
                key={card.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 break-inside-avoid print:bg-white print:border-zinc-300"
              >
                <span className="text-[14px] font-bold text-[var(--color-text)] block">
                  {idx + 1}. {cleanQuestionDisplay(card.front)}
                </span>

                {card.options && card.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[13px]">
                    {card.options.map((opt, oIdx) => {
                      const isAnswer = opt.trim().toLowerCase() === card.back.trim().toLowerCase();
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-[var(--radius-sm)] border flex items-center gap-2 ${
                            isAnswer
                              ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 font-semibold text-[var(--color-text)]'
                              : 'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text-secondary)] opacity-80'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center border border-current shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{cleanOptionDisplay(opt, oIdx)}</span>
                          {isAnswer && <span className="ml-auto text-[11px] font-bold text-[var(--color-success)]">✓ Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {card.explanation && (
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                    <span className="font-bold text-[var(--color-text)] mr-1">Rationale:</span>
                    {card.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty State ── */}
      {filteredCards.length === 0 && (
        <div className="p-8 text-center rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
          <span className="text-[28px]">🔍</span>
          <h4 className="text-[15px] font-bold text-[var(--color-text)]">No matching concepts found</h4>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Try searching for another keyword or clear the search field to view all principles.
          </p>
        </div>
      )}
    </div>
  );
}
