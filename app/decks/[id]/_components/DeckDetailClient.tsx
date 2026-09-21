'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Deck, DeckStats, Card } from '@/types';
import { Button, Badge, SegmentedControl, ProgressRing } from '@/components/ui';
import DeckManageActions from './DeckManageActions';
import DeckAssessmentsList from './DeckAssessmentsList';
import DeckStudyGuide from './DeckStudyGuide';
import { getDeckAssessmentProgress } from '@/lib/assessments';
import { calculateExamReadiness, type ExamReadinessResult } from '@/lib/readiness';

interface Props {
  deck: Deck;
  stats: DeckStats;
  cards: Card[];
}

export default function DeckDetailClient({ deck, stats, cards }: Props) {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'guide'>('curriculum');
  const [readiness, setReadiness] = useState<ExamReadinessResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateScore = () => {
      const progress = getDeckAssessmentProgress(deck.id);
      const res = calculateExamReadiness(progress, stats.totalCards, stats.masteredCount);
      setReadiness(res);
    };

    updateScore();
    window.addEventListener('cadence_assessment_updated', updateScore);
    return () => window.removeEventListener('cadence_assessment_updated', updateScore);
  }, [deck.id, stats.totalCards, stats.masteredCount]);

  const masteryPercent =
    stats.totalCards > 0
      ? Math.round((stats.masteredCount / stats.totalCards) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* ── 1. Title and Action Banner ─────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="neutral" size="sm" className="uppercase">
              {deck.sourceType}
            </Badge>
            {stats.dueNow > 0 ? (
              <Badge variant="accent" size="sm">
                {stats.dueNow} Due
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Up to date
              </Badge>
            )}
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--color-text)]">
            {deck.title}
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
            {cards.length} Question Items · Created {new Date(deck.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <DeckManageActions
            deckId={deck.id}
            deckTitle={deck.title}
            isArchived={Boolean(deck.isArchived)}
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link href={`/decks/${deck.id}/review?mode=cram`} className="flex-1 sm:flex-initial">
              <Button variant="secondary" size="md" className="w-full sm:w-auto text-[13px] sm:text-[14px]">
                Cram All ({stats.totalCards})
              </Button>
            </Link>
            <Link href={`/decks/${deck.id}/review?mode=mastery`} className="flex-1 sm:flex-initial">
              <Button variant="primary" size="md" className="w-full sm:w-auto text-[13px] sm:text-[14px]">
                Start Review ({stats.dueNow > 0 ? stats.dueNow : stats.totalCards})
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Diagnostic Exam Readiness Score Card ────────────────────── */}
      <section className="p-4 sm:p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing
                percent={mounted && readiness ? readiness.score : masteryPercent}
                size={80}
                strokeWidth={7}
                color="var(--color-text)"
              />
              <span className="absolute text-[16px] font-bold text-[var(--color-text)]">
                {mounted && readiness ? readiness.score : masteryPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Diagnostic Evaluation
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
                  Academic Model
                </span>
              </div>
              <h2 className="text-[20px] font-bold text-[var(--color-text)]">
                {mounted && readiness ? readiness.label : 'Evaluating Readiness…'}
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
                Calculated from curriculum progression, historic test scores, and FSRS retrieval stability.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:border-l sm:border-[var(--color-border)] sm:pl-6 shrink-0">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Linear Tests
              </span>
              <span className="text-[16px] font-bold text-[var(--color-text)]">
                {mounted && readiness ? `${readiness.breakdown.curriculumProgress}%` : '—'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Avg. Score
              </span>
              <span className="text-[16px] font-bold text-[var(--color-text)]">
                {mounted && readiness && readiness.breakdown.averageScore > 0 ? `${readiness.breakdown.averageScore}%` : '—'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Retention
              </span>
              <span className="text-[16px] font-bold text-[var(--color-success)]">
                {mounted && readiness ? `${readiness.breakdown.retentionStability}%` : `${masteryPercent}%`}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
          <span className="text-[var(--color-text-secondary)]">
            Need an official evaluation and study prescription?
          </span>
          <Link
            href={`/decks/${deck.id}/diagnostic`}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)] hover:underline"
          >
            <span>View Full Diagnostic Report (Print / PDF)</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* ── 3. Apple Segmented Control Tab Switcher ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            name="deck-view-mode"
            size="md"
            options={[
              { value: 'curriculum', label: 'Curriculum Roadmap' },
              { value: 'guide', label: 'Key Principles' },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'curriculum' | 'guide')}
          />
        </div>

        <span className="text-[13px] text-[var(--color-text-secondary)] font-medium">
          {activeTab === 'curriculum'
            ? 'Structured sequence: 3 Quizzes, 2 Long Quizzes, 1 Comprehensive Exam'
            : 'Pre-quiz synthesis: searchable key definitions and core mechanisms'}
        </span>
      </div>

      {/* ── 4. Tab Views ──────────────────────────────────────────────── */}
      {activeTab === 'curriculum' ? (
        <DeckAssessmentsList deckId={deck.id} totalCards={stats.totalCards} />
      ) : (
        <DeckStudyGuide deckTitle={deck.title} cards={cards} deckId={deck.id} />
      )}
    </div>
  );
}
