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
import { getLocalCustomCards } from '@/lib/data';
import {
  getDeckExamDate,
  setDeckExamDate,
  calculatePacing,
  type ExamPacingResult,
} from '@/lib/exam-pacing';

interface Props {
  deck: Deck;
  stats: DeckStats;
  cards: Card[];
}

export default function DeckDetailClient({ deck, stats, cards }: Props) {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'guide'>('curriculum');
  const [readiness, setReadiness] = useState<ExamReadinessResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [cardList, setCardList] = useState<Card[]>(cards);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [pacing, setPacing] = useState<ExamPacingResult | null>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);

  useEffect(() => {
    setMounted(true);

    const localCards = getLocalCustomCards(deck.id);
    if (localCards.length > 0 && cards.length === 0) {
      setCardList(localCards);
    }

    const totalCardCount = cards.length > 0 ? cards.length : localCards.length || stats.totalCards;
    const storedDate = getDeckExamDate(deck.id);
    setExamDate(storedDate);

    const updateScoreAndPacing = () => {
      const progress = getDeckAssessmentProgress(deck.id);
      const res = calculateExamReadiness(progress, totalCardCount, stats.masteredCount);
      setReadiness(res);

      const completedCount = Object.values(progress).filter((p) => p.completed).length;
      const pacingRes = calculatePacing(
        storedDate,
        totalCardCount,
        stats.masteredCount,
        completedCount,
        7
      );
      setPacing(pacingRes);
    };

    updateScoreAndPacing();
    window.addEventListener('cadence_assessment_updated', updateScoreAndPacing);
    return () => window.removeEventListener('cadence_assessment_updated', updateScoreAndPacing);
  }, [deck.id, stats.totalCards, stats.masteredCount]);

  const handleSetExamDate = (newDate: string | null) => {
    setExamDate(newDate);
    setDeckExamDate(deck.id, newDate);
    setIsEditingDate(false);

    const totalCardCount = cardList.length > 0 ? cardList.length : stats.totalCards;
    const progress = getDeckAssessmentProgress(deck.id);
    const completedCount = Object.values(progress).filter((p) => p.completed).length;
    const pacingRes = calculatePacing(
      newDate,
      totalCardCount,
      stats.masteredCount,
      completedCount,
      7
    );
    setPacing(pacingRes);
  };

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const dateStr = d.toISOString().split('T')[0];
    handleSetExamDate(dateStr);
  };

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
            {cardList.length > 0 ? cardList.length : stats.totalCards} Question Items · Created {new Date(deck.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <DeckManageActions
            deckId={deck.id}
            deckTitle={deck.title}
            isArchived={Boolean(deck.isArchived)}
          />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link href={`/decks/${deck.id}/reviewer`} className="flex-1 sm:flex-initial">
              <Button variant="secondary" size="md" className="w-full sm:w-auto text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5">
                <span>📄</span>
                <span>Reviewer PDF</span>
              </Button>
            </Link>
            <Link href={`/decks/${deck.id}/review?mode=cram`} className="flex-1 sm:flex-initial">
              <Button variant="secondary" size="md" className="w-full sm:w-auto text-[13px] sm:text-[14px]">
                Cram All ({cardList.length > 0 ? cardList.length : stats.totalCards})
              </Button>
            </Link>
            <Link href={`/decks/${deck.id}/review?mode=mastery`} className="flex-1 sm:flex-initial">
              <Button variant="primary" size="md" className="w-full sm:w-auto text-[13px] sm:text-[14px]">
                Start Review ({stats.dueNow > 0 ? stats.dueNow : cardList.length > 0 ? cardList.length : stats.totalCards})
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Study Progress & Readiness Score Card ────────────────────── */}
      <section className="p-4 sm:p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing
                percent={mounted && readiness ? readiness.score : masteryPercent}
                size={80}
                strokeWidth={7}
                color={
                  mounted && readiness && readiness.score >= 75
                    ? 'var(--color-success)'
                    : 'var(--color-text)'
                }
                showPercent={false}
              />
              <span className="absolute text-[18px] font-extrabold tracking-tight text-[var(--color-text)]">
                {mounted && readiness ? readiness.score : masteryPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Study Progress
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
                  Quiz Roadmap
                </span>
              </div>
              <h2 className="text-[19px] sm:text-[21px] font-bold text-[var(--color-text)] tracking-tight">
                {mounted && readiness ? readiness.label : 'Loading Progress…'}
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
                Complete the short quizzes and review your flashcards to master this deck before your exam.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:border-l sm:border-[var(--color-border)] sm:pl-6 shrink-0">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Quizzes
              </span>
              <span className="text-[16px] font-bold text-[var(--color-text)] block">
                {mounted && readiness
                  ? `${readiness.breakdown.completedCount ?? Math.round((readiness.breakdown.curriculumProgress / 100) * 7)} of 7`
                  : '0 of 7'}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block">
                {mounted && readiness ? `${readiness.breakdown.curriculumProgress}% done` : '0%'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Quiz Score
              </span>
              <span className="text-[16px] font-bold text-[var(--color-text)] block">
                {mounted && readiness && readiness.breakdown.averageScore > 0
                  ? `${readiness.breakdown.averageScore}%`
                  : '—'}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block">
                {mounted && readiness && readiness.breakdown.averageScore > 0
                  ? readiness.breakdown.averageScore >= 75
                    ? 'Passing'
                    : 'Needs review'
                  : 'Not taken'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
                Cards Mastered
              </span>
              <span
                className={`text-[16px] font-bold block ${
                  stats.masteredCount > 0
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-text)]'
                }`}
              >
                {stats.masteredCount} of {cardList.length > 0 ? cardList.length : stats.totalCards}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block">
                {masteryPercent}% mastered
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
          <span className="text-[var(--color-text-secondary)]">
            Study offline or review detailed results:
          </span>
          <div className="flex items-center gap-4">
            <Link
              href={`/decks/${deck.id}/reviewer`}
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)] hover:underline"
            >
              <span>📄 Printable Reviewer PDF</span>
            </Link>
            <span className="text-[var(--color-border)]">•</span>
            <Link
              href={`/decks/${deck.id}/diagnostic`}
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)] hover:underline"
            >
              <span>Progress Report</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2.5. Exam Countdown & Daily Study Pacing Widget ────────────────────── */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[20px] shrink-0">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--color-text)]">
                  Target Exam Date &amp; Daily Study Pace
                </h3>
                {pacing?.isSet && (
                  <Badge
                    variant={pacing.isToday ? 'accent' : pacing.isPast ? 'neutral' : 'success'}
                    size="sm"
                    className="font-bold text-[11px]"
                  >
                    {pacing.statusLabel}
                  </Badge>
                )}
              </div>
              <p className="text-[13px] text-[var(--color-text-secondary)] font-medium mt-0.5">
                {mounted && pacing ? pacing.pacingSummary : 'Set your exam date to generate a personalized daily pace.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={examDate || ''}
                  onChange={(e) => handleSetExamDate(e.target.value || null)}
                  className="px-2.5 py-1 text-[13px] rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-text)]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDate(false)}
                  className="text-[12px]"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {!examDate ? (
                  <>
                    <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] mr-1 hidden sm:inline">
                      Quick Set:
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickDate(3)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                    >
                      3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(7)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                    >
                      1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(14)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                    >
                      2 Weeks
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDate(true)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                    >
                      Pick Date…
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingDate(true)}
                      className="px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                    >
                      Change Date ({examDate})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetExamDate(null)}
                      className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-rose-500 transition-colors"
                      title="Clear exam date"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Segmented Control Tab Switcher ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            name="deck-view-mode"
            size="md"
            options={[
              { value: 'curriculum', label: 'Quizzes & Exam' },
              { value: 'guide', label: 'Study Guide' },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'curriculum' | 'guide')}
          />
        </div>

        <span className="text-[13px] text-[var(--color-text-secondary)] font-medium">
          {activeTab === 'curriculum'
            ? 'Structured path: 4 Short Quizzes, 2 Long Quizzes, 1 Comprehensive Exam'
            : 'Searchable summary of key terms, definitions, and concepts'}
        </span>
      </div>

      {/* ── 4. Tab Views ──────────────────────────────────────────────── */}
      {activeTab === 'curriculum' ? (
        <DeckAssessmentsList deckId={deck.id} totalCards={cardList.length > 0 ? cardList.length : stats.totalCards} />
      ) : (
        <DeckStudyGuide deckTitle={deck.title} cards={cardList} deckId={deck.id} />
      )}
    </div>
  );
}
