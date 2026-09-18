'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMistakes,
  updateMistakeTaxonomy,
  toggleResolveMistake,
  clearResolvedMistakes,
  TAXONOMY_CONFIG,
  type MistakeEntry,
  type ErrorTaxonomy,
} from '@/lib/mistakes';
import { Button, Badge } from '@/components/ui';
import { AIRationaleModal } from '@/components/review';
import type { Card } from '@/types';

export default function NotebookClient() {
  const router = useRouter();
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [activeAiCard, setActiveAiCard] = useState<Card | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = () => {
      setMistakes(getMistakes());
    };
    load();
    window.addEventListener('cadence_mistakes_updated', load);
    return () => window.removeEventListener('cadence_mistakes_updated', load);
  }, []);

  const decks = Array.from(new Set(mistakes.map((m) => m.deckTitle)));

  const filteredMistakes = mistakes.filter((m) => {
    if (!showResolved && m.resolved) return false;
    if (selectedDeck !== 'all' && m.deckTitle !== selectedDeck) return false;
    if (selectedTaxonomy !== 'all' && m.taxonomy !== selectedTaxonomy) return false;
    return true;
  });

  const unresolvedCount = mistakes.filter((m) => !m.resolved).length;

  const handleDrill = () => {
    if (filteredMistakes.length === 0) return;
    const targetDeckId = filteredMistakes[0].deckId;
    const cardIds = filteredMistakes.map((m) => m.cardId).join(',');
    router.push(`/decks/${targetDeckId}/review?drill=mistakes&cards=${cardIds}`);
  };

  if (!mounted) {
    return (
      <div className="py-24 text-center">
        <div className="w-7 h-7 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-[14px] text-[var(--color-text-secondary)]">Loading Mistake Notebook…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── 1. Header & Summary ────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="neutral" size="sm" className="uppercase font-bold">
              Cognitive Error Log
            </Badge>
            <Badge variant={unresolvedCount > 0 ? 'accent' : 'success'} size="sm">
              {unresolvedCount} Unresolved Mistakes
            </Badge>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--color-text)]">
            Mistake Notebook
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1 max-w-xl leading-relaxed">
            Classify and remediate cognitive pitfalls across your decks. Focus on understanding the root cause of every incorrect response.
          </p>
        </div>

        {filteredMistakes.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={handleDrill}
              className="flex items-center gap-2 !bg-[var(--color-text)] !text-[var(--color-bg)]"
            >
              <span>🎯 Drill Filtered ({filteredMistakes.length}) →</span>
            </Button>
          </div>
        )}
      </section>

      {/* ── 2. Error Taxonomy Stat Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(TAXONOMY_CONFIG) as ErrorTaxonomy[]).map((tax) => {
          const cfg = TAXONOMY_CONFIG[tax];
          const count = mistakes.filter((m) => !m.resolved && m.taxonomy === tax).length;
          const isSelected = selectedTaxonomy === tax;
          return (
            <button
              key={tax}
              type="button"
              onClick={() => setSelectedTaxonomy(isSelected ? 'all' : tax)}
              className={`p-3.5 rounded-[var(--radius-md)] border text-left transition-all ${
                isSelected
                  ? 'border-[var(--color-text)] bg-[var(--color-surface-raised)] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-tertiary)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[16px]">{cfg.icon}</span>
                <span className="text-[14px] font-bold text-[var(--color-text)]">{count}</span>
              </div>
              <div className="text-[11px] font-semibold text-[var(--color-text)] truncate">
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 3. Filters & Controls ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-secondary)] font-medium text-[12px]">Deck:</span>
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[12px] text-[var(--color-text)] focus:outline-none"
            >
              <option value="all">All Decks ({mistakes.length})</option>
              {decks.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-[12px] text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-text)] focus:ring-0"
            />
            <span>Show resolved items</span>
          </label>
        </div>

        {mistakes.some((m) => m.resolved) && (
          <button
            type="button"
            onClick={() => clearResolvedMistakes()}
            className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
          >
            Clear Resolved
          </button>
        )}
      </div>

      {/* ── 4. Mistake Cards List ──────────────────────────────────────── */}
      {filteredMistakes.length === 0 ? (
        <div className="py-20 text-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[22px]">
            ✓
          </div>
          <h3 className="text-[17px] font-bold text-[var(--color-text)]">
            Mistake Notebook is Clear
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] max-w-sm mx-auto">
            No unaddressed errors matching your filters. Keep practicing quizzes to capture new cognitive distinctions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((item) => {
            const taxConfig = TAXONOMY_CONFIG[item.taxonomy];
            const cardRepresentation: Card = {
              id: item.cardId,
              deckId: item.deckId,
              front: item.front,
              back: item.back,
              type: item.cardType as 'basic' | 'cloze' | 'mcq',
              explanation: item.explanation,
              options: item.options,
              due: item.recordedAt,
              stability: 1,
              difficulty: 5,
              reps: item.reviewedCount,
            };

            return (
              <div
                key={item.id}
                className={`p-5 rounded-[var(--radius-lg)] border transition-all ${
                  item.resolved
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)]/50 opacity-60'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]'
                } space-y-4`}
              >
                {/* Top Info Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)] text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--color-text)] truncate max-w-xs">
                      {item.deckTitle}
                    </span>
                    <span className="text-[var(--color-border)]">•</span>
                    <span className="uppercase text-[10px] font-bold text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)]">
                      {item.cardType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      Encountered {item.reviewedCount}x
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleResolveMistake(item.cardId)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                        item.resolved
                          ? 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {item.resolved ? '✓ Mastered' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="space-y-2">
                  <div className="text-[15px] font-semibold text-[var(--color-text)] leading-snug">
                    {item.front}
                  </div>
                  <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13.5px] text-[var(--color-text)]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                      Correct Key Concept:
                    </span>
                    {item.back}
                  </div>
                </div>

                {/* Bottom Actions & Cognitive Taxonomy Tagging */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase mr-1">
                      Error Type:
                    </span>
                    {(['misread', 'concept', 'gap', 'calculation'] as ErrorTaxonomy[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateMistakeTaxonomy(item.cardId, t)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                          item.taxonomy === t
                            ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)] font-bold'
                            : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {TAXONOMY_CONFIG[t].icon} {TAXONOMY_CONFIG[t].label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveAiCard(cardRepresentation)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text)] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors active:scale-95"
                    >
                      <span>💡 AI Rationale</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Socratic Rationale Modal */}
      {activeAiCard && (
        <AIRationaleModal
          card={activeAiCard}
          isOpen={Boolean(activeAiCard)}
          onClose={() => setActiveAiCard(null)}
        />
      )}
    </div>
  );
}
