'use client';

import React, { useState, useEffect } from 'react';
import type { Card } from '@/types';
import type { ExplainResponse } from '@/app/api/review/explain/route';
import { Button, Badge } from '@/components/ui';

interface Props {
  card: Card;
  chosenAnswer?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AIRationaleModal({ card, chosenAnswer, isOpen, onClose }: Props) {
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchRationale() {
      try {
        const res = await fetch('/api/review/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: card.front,
            chosenAnswer: chosenAnswer || undefined,
            correctAnswer: card.back,
            explanation: card.explanation,
            cardType: card.type,
            options: card.options && card.options.length > 0 ? card.options : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to load rationale: ${res.statusText}`);
        }

        const json: ExplainResponse = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching rationale');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRationale();

    return () => {
      isMounted = false;
    };
  }, [isOpen, card, chosenAnswer]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Socratic Rationale Tutor"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl p-4 sm:p-7 space-y-5 text-[var(--color-text)] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Socratic Rationale Tutor
              </span>
              <Badge variant="accent" size="sm" className="font-semibold text-[10px]">
                {data?.source === 'ai' ? 'Claude / Gemini AI' : 'Cognitive Heuristic'}
              </Badge>
            </div>
            <h3 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[var(--color-text)]">
              Conceptual Contrast Analysis
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors text-[18px]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Analyzing cognitive traps and causal mechanisms…
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[13px]">
            {error}
          </div>
        )}

        {/* Loaded Content */}
        {!loading && data && (
          <div className="space-y-4 text-[13.5px] leading-relaxed">
            {/* The Causal Mechanism (Why Correct) */}
            <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓</span> Why The Correct Answer Is Right
                </span>
              </div>
              <p className="text-[var(--color-text)] font-medium leading-relaxed">
                {data.correctPrinciple}
              </p>
            </div>

            {/* Why Other Options Are Wrong (Distractor Breakdown) */}
            {data.distractors && data.distractors.filter((d) => !d.isCorrect).length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                  ✗ Why Other Options Are Wrong (Distractor Analysis)
                </span>
                <div className="space-y-2">
                  {data.distractors
                    .filter((d) => !d.isCorrect)
                    .map((distractor, idx) => {
                      const isChosen =
                        chosenAnswer &&
                        distractor.option.trim().toLowerCase() === chosenAnswer.trim().toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-[var(--radius-md)] border space-y-1 transition-all ${
                            isChosen
                              ? 'bg-amber-500/10 border-amber-500/40 text-[var(--color-text)]'
                              : 'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-[13px] text-rose-500 shrink-0">
                                ✗
                              </span>
                              <span className="font-semibold text-[13px] text-[var(--color-text)] truncate">
                                {distractor.option}
                              </span>
                            </div>
                            {isChosen && (
                              <Badge variant="accent" size="sm" className="font-bold text-[10px] shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                ⚠️ Your Choice
                              </Badge>
                            )}
                          </div>
                          <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed pl-4">
                            {distractor.explanation}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Fallback Single Trap Card when no multi-choice distractors */
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {chosenAnswer ? '⚠️ The Cognitive Trap in Your Choice' : '⚠️ Common Distractor Pitfall'}
                  </span>
                </div>
                <p className="text-[var(--color-text-secondary)]">
                  {data.misconception}
                </p>
              </div>
            )}

            {/* Key Active-Recall Takeaway */}
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-text)] text-[var(--color-bg)] space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-80 block">
                🧠 Anchor Takeaway for Active Recall
              </span>
              <p className="font-semibold text-[13px] italic">
                &ldquo;{data.keyTakeaway}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} className="w-full sm:w-auto">
            Understood · Continue Review
          </Button>
        </div>
      </div>
    </div>
  );
}
