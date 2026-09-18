'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { completeSession } from '@/lib/data';
import { Button, Badge } from '@/components/ui';
import {
  recordSessionCompletion,
  calculateSessionStars,
  getUserStats,
  type UserStats,
} from '@/lib/gamification';

// --- Types -----------------------------------------------------------------

interface SessionSummary {
  deckId: string;
  cardsReviewed: number;
  accuracy: number;
  streak: number;
  dueNext: string;
  mode: string;
}

// --- Helpers ---------------------------------------------------------------

function getMotivationalMessage(accuracy: number): string {
  if (accuracy >= 1.0) return "🏆 Perfect Score! You're a memory champion!";
  if (accuracy >= 0.9) return '🎯 Excellent recall! Keep it up!';
  if (accuracy >= 0.7) return '📈 Good progress! A little more practice makes perfect.';
  return '💪 Keep studying! Every review builds memory traces.';
}

// --- Sub-components --------------------------------------------------------

interface StarRatingProps {
  earned: 1 | 2 | 3;
  revealed: boolean;
}

function StarRating({ earned, revealed }: StarRatingProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-4" role="img" aria-label={`${earned} out of 3 stars`}>
        {([1, 2, 3] as const).map((star) => {
          const isFilled = star <= earned;
          const delayMs = (star - 1) * 200;
          return (
            <span
              key={star}
              className={`text-5xl sm:text-6xl select-none ${
                revealed ? 'animate-star-pop' : 'opacity-0'
              }`}
              style={{ animationDelay: `${delayMs}ms` }}
              aria-hidden="true"
            >
              {isFilled ? (
                <span style={{ filter: 'drop-shadow(0 2px 8px rgba(255,159,10,0.5))' }}>&#11088;</span>
              ) : (
                <span style={{ opacity: 0.25, filter: 'grayscale(1)' }}>&#11088;</span>
              )}
            </span>
          );
        })}
      </div>
      <span
        className="text-[13px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {earned} / 3 Stars
      </span>
    </div>
  );
}

interface XPPillProps {
  bonusXP: number;
  totalXP: number;
  level: number;
  revealed: boolean;
}

function XPPill({ bonusXP, totalXP, level, revealed }: XPPillProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${revealed ? 'animate-fade-slide-up' : 'opacity-0'}`}
      style={{ animationDelay: '700ms' }}
    >
      <div
        className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-[15px]"
        style={{
          background: 'linear-gradient(135deg, rgba(255,159,10,0.13) 0%, rgba(255,159,10,0.26) 100%)',
          border: '1.5px solid rgba(255,159,10,0.4)',
          color: '#ff9f0a',
          boxShadow: '0 2px 12px rgba(255,159,10,0.18)',
        }}
      >
        <span style={{ fontSize: '18px' }}>&#9889;</span>
        +{bonusXP} XP Earned
      </div>
      <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
        {'Total: '}
        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
          {totalXP.toLocaleString()} XP
        </span>
        {' · Level '}
        <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
          {level}
        </span>
      </span>
    </div>
  );
}

// --- StatCard --------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  subColor?: string;
}

function StatCard({ label, value, sub, valueColor, subColor }: StatCardProps) {
  return (
    <div
      className="p-4 rounded-[var(--radius-md)] text-center flex flex-col items-center justify-center gap-1"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wide block"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <span
        className="text-[20px] font-bold leading-tight"
        style={{ color: valueColor ?? 'var(--color-text)' }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-[11px] font-semibold"
          style={{ color: subColor ?? 'var(--color-text-tertiary)' }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// --- Main Page -------------------------------------------------------------

export default function SessionSummaryPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const deckId = (params?.id as string) || '';
  const sessionId = searchParams?.get('sessionId') || '';

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);
  const [starsEarned, setStarsEarned] = useState<1 | 2 | 3>(1);
  const [bonusXP, setBonusXP] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [starsRevealed, setStarsRevealed] = useState(false);
  const [gamificationRevealed, setGamificationRevealed] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      const data = await completeSession(sessionId);
      setSummary(data);

      // Gamification
      const stars = calculateSessionStars(data.accuracy);
      setStarsEarned(stars);

      const { bonusXP: xp } = recordSessionCompletion(data.accuracy, data.cardsReviewed);
      setBonusXP(xp);

      const stats = getUserStats();
      setUserStats(stats);

      // Accuracy count-up animation
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

      // Sequenced reveals
      setTimeout(() => setStarsRevealed(true), 300);
      setTimeout(() => setGamificationRevealed(true), 650);

      return () => clearInterval(timer);
    }

    loadSummary();
  }, [sessionId]);

  // Loading state
  if (!summary) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
          />
          <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
            Calculating session statistics…
          </span>
        </div>
      </div>
    );
  }

  const motivationalMessage = getMotivationalMessage(summary.accuracy);
  const accuracyPercent = Math.round(summary.accuracy * 100);

  return (
    <main
      className="min-h-dvh flex flex-col p-6 sm:p-12 max-w-xl mx-auto w-full gap-8"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-4">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Back to deck"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Back to Deck</span>
        </Link>
        <Badge variant="success" size="sm" className="capitalize">
          {summary.mode} Session Complete
        </Badge>
        <Link
          href="/"
          className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          Dashboard
        </Link>
      </header>

      {/* Stars hero */}
      <section className="flex flex-col items-center gap-5 pt-2">
        <StarRating earned={starsEarned} revealed={starsRevealed} />
        {userStats && (
          <XPPill
            bonusXP={bonusXP}
            totalXP={userStats.xp}
            level={userStats.level}
            revealed={gamificationRevealed}
          />
        )}
      </section>

      {/* Accuracy count-up */}
      <section className="flex flex-col items-center gap-2 animate-count-up">
        <div
          className="text-[64px] sm:text-[72px] font-extrabold tracking-tight leading-none"
          style={{ color: 'var(--color-text)' }}
        >
          {animatedAccuracy}%
        </div>
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Retention Accuracy
        </span>
        <p
          className="text-[15px] text-center max-w-xs mt-1 font-medium animate-fade-slide-up"
          style={{ color: 'var(--color-text-secondary)', animationDelay: '900ms' }}
        >
          {motivationalMessage}
        </p>
      </section>

      {/* Stats grid */}
      <section
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full animate-fade-slide-up"
        style={{ animationDelay: '500ms' }}
      >
        <StatCard label="Reviewed" value={String(summary.cardsReviewed)} sub="cards" />
        <StatCard
          label="Accuracy"
          value={`${accuracyPercent}%`}
          valueColor={
            accuracyPercent === 100
              ? 'var(--color-success)'
              : accuracyPercent >= 70
              ? 'var(--color-text)'
              : 'var(--color-danger)'
          }
        />
        <StatCard
          label="Streak"
          value={`🔥 ${summary.streak}d`}
          valueColor="var(--color-warning)"
        />
        <StatCard
          label="Stars"
          value={'⭐'.repeat(starsEarned) + '·'.repeat(3 - starsEarned)}
          sub={`+${bonusXP} XP`}
          subColor="#ff9f0a"
        />
      </section>

      {/* Action buttons */}
      <footer
        className="flex flex-col gap-3 pb-4 mt-auto animate-fade-slide-up"
        style={{ animationDelay: '800ms' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/decks/${deckId}/review?mode=${summary.mode}`} className="flex-1">
            <Button variant="primary" size="lg" fullWidth>
              Review Again
            </Button>
          </Link>
          <Link href={`/decks/${deckId}`} className="flex-1">
            <Button variant="secondary" size="lg" fullWidth>
              Back to Deck
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="secondary" size="lg" fullWidth>
              Dashboard
            </Button>
          </Link>
        </div>
        <Link href="/profile" className="w-full">
          <Button variant="ghost" size="md" fullWidth>
            View Profile &amp; Badges →
          </Button>
        </Link>
      </footer>
    </main>
  );
}
