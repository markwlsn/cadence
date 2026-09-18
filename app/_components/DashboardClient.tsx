'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserStats } from '@/lib/gamification';
import { getCurrentUser } from '@/lib/auth';
import { deleteDeck, archiveDeck } from '@/lib/data';
import { Badge, Button, ProgressRing } from '@/components/ui';
import type { Deck, DeckStats } from '@/types';
import type { UserStats } from '@/lib/gamification';
import type { User } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  decks: Deck[];
  statsEntries: [string, DeckStats][];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STUDY_QUOTES = [
  'Every card you review is a step toward mastery. Keep going!',
  'The secret of getting ahead is getting started.',
  'Small daily improvements lead to stunning results over time.',
  'Your future self will thank you for studying today.',
];

const SOURCE_LABELS: Record<string, string> = {
  pdf: '📄 PDF',
  image: '📷 Photo',
  text: '✍️ Text',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getStarCount(masterPercent: number): 1 | 2 | 3 {
  if (masterPercent > 66) return 3;
  if (masterPercent > 33) return 2;
  return 1;
}

function StarRating({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <svg
          key={n}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={n <= count ? 'var(--color-warning)' : 'none'}
          stroke={n <= count ? 'var(--color-warning)' : 'var(--color-text-tertiary)'}
          strokeWidth="1.8"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// ─── Quick Stat Card ──────────────────────────────────────────────────────────

function QuickStatCard({
  icon,
  label,
  value,
  sub,
  progressPercent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  progressPercent?: number;
}) {
  return (
    <div className="flex-1 min-w-0 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex flex-col gap-1">
      <div className="text-[22px] leading-none">{icon}</div>
      <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">
        {label}
      </div>
      <div className="text-[20px] font-bold text-[var(--color-text)] leading-tight truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{sub}</div>
      )}
      {typeof progressPercent === 'number' && (
        <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Mastery Progress Bar ─────────────────────────────────────────────────────

function MasteryBar({ percent }: { percent: number }) {
  const color =
    percent >= 66
      ? 'var(--color-success)'
      : percent >= 33
      ? 'var(--color-warning)'
      : 'var(--color-accent)';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--color-text-secondary)] font-medium">Mastery</span>
        <span className="font-bold" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-20 px-6 border-2 border-dashed border-[var(--color-border-strong)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
      <div className="text-[64px] mb-4 select-none">📚</div>
      <h3 className="text-[20px] font-bold text-[var(--color-text)] mb-2">No decks yet</h3>
      <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mx-auto mb-6">
        Create your first deck by uploading lecture notes, a PDF, or typing your own content.
      </p>
      <Link href="/decks/new">
        <Button variant="primary" size="md">
          + Create First Deck
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Dashboard Client ────────────────────────────────────────────────────

export default function DashboardClient({ decks, statsEntries }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState(STUDY_QUOTES[0]);
  const [greeting, setGreeting] = useState('Welcome');
  const [deckList, setDeckList] = useState<Deck[]>(decks);
  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build statsMap from serialised entries
  const statsMap = new Map<string, DeckStats>(statsEntries);

  useEffect(() => {
    setMounted(true);
    setQuote(STUDY_QUOTES[Math.floor(Math.random() * STUDY_QUOTES.length)]);
    setGreeting(getGreeting());
    setUser(getCurrentUser());
    setStats(getUserStats());

    const handleStats = (e: CustomEvent) => setStats(e.detail as UserStats);
    const handleAuth = (e: CustomEvent) => setUser(e.detail as User);

    window.addEventListener('cadence_stats_updated', handleStats as EventListener);
    window.addEventListener('cadence_auth_updated', handleAuth as EventListener);
    return () => {
      window.removeEventListener('cadence_stats_updated', handleStats as EventListener);
      window.removeEventListener('cadence_auth_updated', handleAuth as EventListener);
    };
  }, []);

  const handleDeleteDeck = async (deckId: string, deckTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${deckTitle}" and all its flashcards? This action cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(deckId);
    try {
      await deleteDeck(deckId);
      setDeckList((prev) => prev.filter((d) => d.id !== deckId));
    } catch {
      alert('Failed to delete deck. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleArchive = async (deckId: string, currentArchived: boolean) => {
    try {
      const updated = await archiveDeck(deckId, !currentArchived);
      setDeckList((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, isArchived: updated.isArchived } : d))
      );
    } catch {
      alert('Failed to update archive status.');
    }
  };

  const activeDecks = deckList.filter((d) => !d.isArchived);
  const archivedDecks = deckList.filter((d) => Boolean(d.isArchived));
  const displayedDecks = filterTab === 'archived' ? archivedDecks : activeDecks;

  // Find the deck with the most due cards for "Drill Weak Cards"
  const drillDeck = activeDecks.reduce<Deck | null>((best, deck) => {
    const s = statsMap.get(deck.id);
    const bestS = best ? statsMap.get(best.id) : null;
    if (!s) return best;
    if (!bestS || s.dueNow > bestS.dueNow) return deck;
    return best;
  }, null);

  const currentStats = stats;
  const dailyGoalPercent = currentStats
    ? Math.min(100, Math.round((currentStats.todayStudiedCount / currentStats.dailyGoal) * 100))
    : 0;

  const displayName = mounted && user ? user.name.split(' ')[0] : 'Scholar';

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
      {/* ── A. Hero Banner ─────────────────────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent)]/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[var(--color-text)] leading-tight">
              {greeting}, {displayName}! 👋
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--color-text-secondary)] italic max-w-md">
              "{quote}"
            </p>
          </div>
        </div>

        {/* Daily Goal Progress */}
        {mounted && currentStats && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[var(--color-text)]">Daily Goal</span>
              <span className="text-[var(--color-text-secondary)]">
                <span className="font-bold text-[var(--color-text)]">
                  {currentStats.todayStudiedCount}
                </span>{' '}
                / {currentStats.dailyGoal} cards reviewed today
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700"
                style={{ width: `${dailyGoalPercent}%` }}
              />
            </div>
            {dailyGoalPercent >= 100 && (
              <p className="text-[12px] font-semibold text-[var(--color-success)]">
                ✅ Daily goal complete! Great work!
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── B. Quick Stats Row ─────────────────────────────────────────────── */}
      {mounted && currentStats && (
        <section aria-label="Your stats">
          <div className="flex flex-row gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
            <QuickStatCard
              icon="🔥"
              label="Day Streak"
              value={`${currentStats.streak} days`}
            />
            <QuickStatCard
              icon="⚡"
              label="Level"
              value={`Lv.${currentStats.level}`}
              sub={currentStats.title}
            />
            <QuickStatCard
              icon="⭐"
              label="Stars"
              value={`${currentStats.totalStars} earned`}
            />
            <QuickStatCard
              icon="🎯"
              label="Level XP"
              value={`${currentStats.xp} XP`}
              sub={`of ${currentStats.nextLevelXP} XP`}
              progressPercent={currentStats.levelProgressPercent}
            />
          </div>
        </section>
      )}

      {/* ── C. Quick Actions Row ───────────────────────────────────────────── */}
      <section aria-label="Quick actions">
        <div className="flex flex-row gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <Link href="/decks/new" className="shrink-0">
            <Button variant="primary" size="sm">
              + Create New Deck
            </Button>
          </Link>
          {drillDeck && (
            <Link href={`/decks/${drillDeck.id}/review?mode=mastery`} className="shrink-0">
              <Button variant="secondary" size="sm">
                🎯 Drill Weak Cards
              </Button>
            </Link>
          )}
          <Link href="/profile" className="shrink-0">
            <Button variant="ghost" size="sm">
              👤 View Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* ── D. Decks Section ───────────────────────────────────────────────── */}
      <section id="decks-section" aria-labelledby="decks-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-baseline gap-3">
            <h2
              id="decks-heading"
              className="text-[22px] font-bold tracking-tight text-[var(--color-text)]"
            >
              My Study Decks
            </h2>
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              {displayedDecks.length} deck{displayedDecks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Active / Archived Tab Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] w-fit">
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1 text-[13px] font-semibold rounded-full transition-all cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Active ({activeDecks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('archived')}
              className={`px-3.5 py-1 text-[13px] font-semibold rounded-full transition-all cursor-pointer ${
                filterTab === 'archived'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Archived ({archivedDecks.length})
            </button>
          </div>
        </div>

        {displayedDecks.length === 0 ? (
          filterTab === 'archived' ? (
            <div className="text-center py-16 px-6 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
              <div className="text-[48px] mb-3 select-none">📦</div>
              <h3 className="text-[18px] font-bold text-[var(--color-text)] mb-1">No archived decks</h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] max-w-sm mx-auto">
                Decks you archive will appear here so you can revisit or restore them anytime.
              </p>
            </div>
          ) : (
            <EmptyState />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedDecks.map((deck) => {
              const s = statsMap.get(deck.id) ?? {
                deckId: deck.id,
                totalCards: 0,
                dueNow: 0,
                masteredCount: 0,
                accuracyLast7Days: 0,
              };

              const masteryPercent =
                s.totalCards > 0
                  ? Math.round((s.masteredCount / s.totalCards) * 100)
                  : 0;

              const stars = getStarCount(masteryPercent);

              return (
                <article
                  key={deck.id}
                  className="group flex flex-col justify-between p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    {/* Badges and action icons row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm">
                          {SOURCE_LABELS[deck.sourceType] ?? deck.sourceType}
                        </Badge>
                        {deck.isArchived && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Archived
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {s.dueNow > 0 ? (
                          <Badge variant="accent" size="sm">
                            {s.dueNow} due
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            All caught up
                          </Badge>
                        )}

                        {/* Archive / Unarchive Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleArchive(deck.id, Boolean(deck.isArchived));
                          }}
                          title={deck.isArchived ? 'Restore to active decks' : 'Archive deck'}
                          aria-label={deck.isArchived ? 'Restore to active decks' : 'Archive deck'}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="5" x="2" y="3" rx="1" />
                            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                            <path d="m10 12 2 2 2-2" />
                          </svg>
                        </button>

                        {/* Delete Deck Button */}
                        <button
                          type="button"
                          disabled={deletingId === deck.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteDeck(deck.id, deck.title);
                          }}
                          title="Delete deck permanently"
                          aria-label="Delete deck permanently"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <Link href={`/decks/${deck.id}`}>
                        <h3 className="text-[19px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors leading-snug">
                          {deck.title}
                        </h3>
                      </Link>
                      <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
                        {s.totalCards} cards · {s.masteredCount} mastered
                      </p>
                    </div>

                    {/* Mastery Progress Bar */}
                    <MasteryBar percent={masteryPercent} />

                    {/* Stars */}
                    <div className="flex items-center gap-1.5">
                      <StarRating count={stars} />
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">
                        {masteryPercent >= 66
                          ? 'Excellent mastery'
                          : masteryPercent >= 33
                          ? 'Making progress'
                          : 'Just starting out'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex items-center gap-2">
                    <Link href={`/decks/${deck.id}/review?mode=mastery`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        Start Review
                      </Button>
                    </Link>
                    <Link href={`/decks/${deck.id}/review?mode=cram`}>
                      <Button variant="secondary" size="sm">
                        Cram All
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
