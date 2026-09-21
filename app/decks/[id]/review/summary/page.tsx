'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { completeSession } from '@/lib/data';
import { Button, Badge } from '@/components/ui';
import { ASSESSMENT_CONFIGS, getNextAssessmentId } from '@/lib/assessments';

interface SessionSummary {
  deckId: string;
  cardsReviewed: number;
  accuracy: number;
  streak: number;
  dueNext: string;
  mode: string;
}

function getPerformanceMessage(accuracy: number): string {
  if (accuracy >= 1.0) return 'Perfect Score! Comprehensive recall verified.';
  if (accuracy >= 0.8) return 'Great work! Solid grasp of concepts and mechanisms.';
  if (accuracy >= 0.7) return 'Passed! Review incorrect cards to reinforce stability.';
  return 'Keep practicing! Retrieval practice strengthens long-term neural traces.';
}

export default function SessionSummaryPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const deckId = (params?.id as string) || '';
  const sessionId = searchParams?.get('sessionId') || '';
  const assessmentId = searchParams?.get('assessment') || null;
  const paramCorrect = searchParams?.get('correct');
  const paramTotal = searchParams?.get('total');
  const paramTime = searchParams?.get('time');
  const paramMissed = searchParams?.get('missed') || '';
  const missedIds = paramMissed ? paramMissed.split(',').filter(Boolean) : [];

  const elapsedSeconds = paramTime ? parseInt(paramTime, 10) : 0;

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);

  const assessmentConfig = assessmentId
    ? ASSESSMENT_CONFIGS.find((a) => a.id === assessmentId) || null
    : null;

  const nextAssessmentId = assessmentId ? getNextAssessmentId(assessmentId) : null;
  const nextAssessmentConfig = nextAssessmentId
    ? ASSESSMENT_CONFIGS.find((a) => a.id === nextAssessmentId) || null
    : null;

  useEffect(() => {
    async function loadSummary() {
      let data: SessionSummary;
      try {
        data = await completeSession(sessionId);
      } catch {
        data = {
          deckId,
          cardsReviewed: paramTotal ? parseInt(paramTotal, 10) : 0,
          accuracy: paramTotal && paramCorrect ? parseInt(paramCorrect, 10) / parseInt(paramTotal, 10) : 0,
          streak: 1,
          dueNext: '',
          mode: 'mastery',
        };
      }
      setSummary(data);

      const targetPercent = Math.round(data.accuracy * 100);
      let current = 0;
      const timer = setInterval(() => {
        current += 2;
        if (current >= targetPercent) {
          setAnimatedAccuracy(targetPercent);
          clearInterval(timer);
        } else {
          setAnimatedAccuracy(current);
        }
      }, 15);

      return () => clearInterval(timer);
    }

    loadSummary();
  }, [sessionId, deckId, paramTotal, paramCorrect]);

  if (!summary) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
          <span className="text-[14px] text-[var(--color-text-secondary)]">
            Finalizing assessment results…
          </span>
        </div>
      </div>
    );
  }

  const accuracyPercent = Math.round(summary.accuracy * 100);
  const isPassed = accuracyPercent >= 70;
  const totalCount = paramTotal ? parseInt(paramTotal, 10) : summary.cardsReviewed;
  const correctCount = paramCorrect
    ? parseInt(paramCorrect, 10)
    : Math.round(summary.cardsReviewed * summary.accuracy);

  return (
    <main className="min-h-dvh flex flex-col p-6 sm:p-12 max-w-xl mx-auto w-full gap-8 bg-[var(--color-bg)]">
      {/* Top Header */}
      <header className="flex items-center justify-between pt-4">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Back to deck"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Deck Curriculum</span>
        </Link>
        <Badge variant={isPassed ? 'success' : 'neutral'} size="sm">
          {assessmentConfig ? `${assessmentConfig.title} Complete` : 'Session Complete'}
        </Badge>
        <Link
          href="/"
          className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          Dashboard
        </Link>
      </header>

      {/* Main Assessment Score Card */}
      <section className="flex flex-col items-center text-center pt-4 space-y-4">
        <span className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {assessmentConfig ? assessmentConfig.subtitle : 'Active Recall Assessment'}
        </span>

        <div className="flex flex-col items-center">
          <div className="text-[64px] sm:text-[80px] font-bold tracking-tight leading-none text-[var(--color-text)]">
            {animatedAccuracy}%
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-text-secondary)] mt-2">
            {correctCount} of {totalCount} Questions Correct
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[13px] font-semibold border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <span className={isPassed ? 'text-[var(--color-success)]' : 'text-amber-500'}>
            {isPassed ? '✓ Passed Assessment' : '⚠️ Practice Recommended'}
          </span>
        </div>

        <p className="text-[14px] text-[var(--color-text-secondary)] max-w-sm leading-relaxed">
          {getPerformanceMessage(summary.accuracy)}
        </p>
      </section>

      {/* Academic Metrics Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
            Questions
          </span>
          <span className="text-[20px] font-bold text-[var(--color-text)]">
            {totalCount}
          </span>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
            Correct
          </span>
          <span className="text-[20px] font-bold text-[var(--color-text)]">
            {correctCount}
          </span>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
            Time &amp; Pace
          </span>
          <span className="text-[18px] font-bold text-[var(--color-text)] block">
            {elapsedSeconds > 0 ? (
              elapsedSeconds >= 60 ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s` : `${elapsedSeconds}s`
            ) : (
              '—'
            )}
          </span>
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)] block">
            {elapsedSeconds > 0 && totalCount > 0
              ? `~${Math.round(elapsedSeconds / totalCount)}s / item`
              : 'Untimed'}
          </span>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
            Status
          </span>
          <span className={`text-[16px] font-bold block ${isPassed ? 'text-[var(--color-success)]' : 'text-amber-500'}`}>
            {isPassed ? 'Passed' : 'Review'}
          </span>
        </div>
      </section>

      {/* Linear Next Actions */}
      <footer className="flex flex-col gap-3 pb-4 mt-auto pt-6 border-t border-[var(--color-border)]">
        {/* Remediation Action: Drill Missed Questions */}
        {missedIds.length > 0 && (
          <Link
            href={`/decks/${deckId}/review?assessment=${assessmentId || ''}&drill=mistakes&cards=${missedIds.join(',')}`}
            className="w-full"
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="text-[15px] font-bold shadow-md bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90"
            >
              🎯 Drill Missed Questions ({missedIds.length} {missedIds.length === 1 ? 'item' : 'items'}) →
            </Button>
          </Link>
        )}

        {nextAssessmentConfig ? (
          <Link
            href={`/decks/${deckId}/review?assessment=${nextAssessmentConfig.id}`}
            className="w-full"
          >
            <Button
              variant={missedIds.length > 0 ? 'secondary' : 'primary'}
              size="lg"
              fullWidth
              className="text-[15px] font-bold"
            >
              Proceed to {nextAssessmentConfig.title} →
            </Button>
          </Link>
        ) : (
          <Link href={`/decks/${deckId}`} className="w-full">
            <Button
              variant={missedIds.length > 0 ? 'secondary' : 'primary'}
              size="lg"
              fullWidth
              className="text-[15px] font-bold"
            >
              Curriculum Complete · Back to Deck →
            </Button>
          </Link>
        )}

        <div className="flex gap-3">
          <Link
            href={
              assessmentId
                ? `/decks/${deckId}/review?assessment=${assessmentId}`
                : `/decks/${deckId}/review?mode=cram`
            }
            className="flex-1"
          >
            <Button variant="secondary" size="md" fullWidth>
              Retake Assessment
            </Button>
          </Link>
          <Link href={`/decks/${deckId}`} className="flex-1">
            <Button variant="secondary" size="md" fullWidth>
              Deck Overview
            </Button>
          </Link>
        </div>
      </footer>
    </main>
  );
}
