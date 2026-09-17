'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { completeSession } from '@/lib/data';
import { Button, Badge } from '@/components/ui';

export default function SessionSummaryPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const deckId = (params?.id as string) || '';
  const sessionId = searchParams?.get('sessionId') || '';

  const [summary, setSummary] = useState<{
    cardsReviewed: number;
    accuracy: number;
    streak: number;
    dueNext: string;
    mode: string;
  } | null>(null);

  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);

  useEffect(() => {
    async function loadSummary() {
      const data = await completeSession(sessionId);
      setSummary(data);

      // Simple smooth count-up animation for accuracy percentage
      const targetPercent = Math.round(data.accuracy * 100);
      let current = 0;
      const stepTime = 15;
      const totalSteps = 40;
      const increment = targetPercent / totalSteps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= targetPercent) {
          setAnimatedAccuracy(targetPercent);
          clearInterval(timer);
        } else {
          setAnimatedAccuracy(Math.round(current));
        }
      }, stepTime);
    }

    loadSummary();
  }, [sessionId]);

  if (!summary) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span className="text-[14px] text-[var(--color-text-secondary)]">
            Calculating session statistics…
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col justify-between p-6 sm:p-12 max-w-xl mx-auto w-full bg-[var(--color-bg)]">
      {/* Header */}
      <header className="flex items-center justify-between pt-4">
        <Link
          href={`/decks/${deckId}`}
          className="text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          ✕ Close
        </Link>
        <Badge variant="success" size="sm" className="capitalize">
          {summary.mode} Session Complete
        </Badge>
        <div className="w-8" aria-hidden="true" />
      </header>

      {/* Hero Stats */}
      <section className="my-auto py-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--color-text)] mb-2">
          Session Complete
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] mb-10 max-w-xs">
          Your brain has reinforced these pathways. Spaced intervals have been updated.
        </p>

        {/* Big Accuracy Display */}
        <div className="mb-10 animate-count-up">
          <div className="text-[64px] sm:text-[72px] font-extrabold tracking-tight text-[var(--color-text)] leading-none">
            {animatedAccuracy}%
          </div>
          <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mt-2">
            Retention Accuracy
          </span>
        </div>

        {/* 3 Core Numbers */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide block mb-1">
              Reviewed
            </span>
            <span className="text-[22px] font-bold text-[var(--color-text)]">
              {summary.cardsReviewed}
            </span>
          </div>

          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide block mb-1">
              Streak
            </span>
            <span className="text-[22px] font-bold text-[var(--color-warning)]">
              🔥 {summary.streak}d
            </span>
          </div>

          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide block mb-1">
              Due Next
            </span>
            <span className="text-[16px] font-bold text-[var(--color-text)] mt-1 block truncate">
              Tomorrow
            </span>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <footer className="flex flex-col sm:flex-row gap-3 pb-4">
        <Link href={`/decks/${deckId}/review?mode=${summary.mode}`} className="flex-1">
          <Button variant="secondary" size="lg" fullWidth>
            Review Again
          </Button>
        </Link>
        <Link href={`/decks/${deckId}`} className="flex-1">
          <Button variant="primary" size="lg" fullWidth>
            Back to Deck
          </Button>
        </Link>
      </footer>
    </main>
  );
}
