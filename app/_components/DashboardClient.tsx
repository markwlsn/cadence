'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserStats } from '@/lib/gamification';
import { getCurrentUser } from '@/lib/auth';
import { deleteDeck, archiveDeck } from '@/lib/data';
import { Badge, Button } from '@/components/ui';
import type { Deck, DeckStats } from '@/types';
import type { UserStats } from '@/lib/gamification';
import type { User } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  decks: Deck[];
  statsEntries: [string, DeckStats][];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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
          width="12"
          height="12"
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

function MasteryBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
        <span>Retention</span>
        <span className="font-semibold text-[var(--color-text)]">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-[var(--color-text)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Dashboard Client ────────────────────────────────────────────────────

export default function DashboardClient({ decks, statsEntries }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');
  const [deckList, setDeckList] = useState<Deck[]>(decks);
  const [filterTab, setFilterTab] = useState<'active' | 'due' | 'archived'>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build statsMap from serialised entries
  const statsMap = new Map<string, DeckStats>(statsEntries);

  useEffect(() => {
    setMounted(true);
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

  // Count total cards due across all active decks
  const totalDueCards = activeDecks.reduce((sum, deck) => {
    const s = statsMap.get(deck.id);
    return sum + (s?.dueNow || 0);
  }, 0);

  const dueDecks = activeDecks.filter((d) => (statsMap.get(d.id)?.dueNow || 0) > 0);

  // Decks to display based on selected tab
  const displayedDecks =
    filterTab === 'archived'
      ? archivedDecks
      : filterTab === 'due'
      ? dueDecks
      : activeDecks;

  // Deck with the most due cards for quick review
  const primaryReviewDeck = dueDecks.length > 0 ? dueDecks[0] : activeDecks[0];

  const currentStats = stats;
  const dailyGoalPercent = currentStats
    ? Math.min(100, Math.round((currentStats.todayStudiedCount / currentStats.dailyGoal) * 100))
    : 0;

  const displayName = mounted && user ? user.name.split(' ')[0] : 'Scholar';

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── 1. Clean Apple Reviewer Header ───────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[var(--color-text)] leading-tight">
            {greeting}, {displayName}!
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {totalDueCards > 0
              ? `You have ${totalDueCards} card${totalDueCards === 1 ? '' : 's'} ready for review today across ${dueDecks.length} deck${dueDecks.length === 1 ? '' : 's'}.`
              : activeDecks.length > 0
              ? 'All caught up on your spaced repetition reviews for today.'
              : 'Welcome to Cadence. Upload your notes to create your first active recall deck.'}
          </p>
        </div>

        {/* Quick Review / Create Action */}
        <div className="flex items-center gap-3 shrink-0">
          {totalDueCards > 0 && primaryReviewDeck ? (
            <Link href={`/decks/${primaryReviewDeck.id}/review?mode=mastery`}>
              <Button variant="primary" size="md" className="shadow-[var(--shadow-sm)]">
                ⚡ Start Daily Review ({totalDueCards})
              </Button>
            </Link>
          ) : (
            <Link href="/decks/new">
              <Button variant="primary" size="md" className="shadow-[var(--shadow-sm)]">
                ✨ Create Deck with AI
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* ── 2. Standard E-Learning 2-Column Workspace ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Primary Review Workspace (8 cols) ────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* AI Notes Ingestion Feature Card */}
          <section className="relative overflow-hidden p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🧠</span>
                  <span className="text-[14px] font-bold tracking-tight text-[var(--color-text)]">
                    AI Study Synthesizer
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                    FSRS Spaced Repetition
                  </span>
                </div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                  Drop lecture PDFs, photos of handwritten notes, or paste summaries. Cadence writes concept flashcards, cloze deletions, and multiple-choice questions automatically.
                </p>
              </div>

              <Link href="/decks/new" className="shrink-0">
                <Button variant="secondary" size="sm" className="whitespace-nowrap">
                  Upload Notes or PDF →
                </Button>
              </Link>
            </div>
          </section>

          {/* Study Decks Section */}
          <section id="decks-section" aria-labelledby="decks-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <h2
                  id="decks-heading"
                  className="text-[20px] font-bold tracking-tight text-[var(--color-text)]"
                >
                  My Study Decks
                </h2>
                <span className="text-[13px] text-[var(--color-text-secondary)] font-medium">
                  ({displayedDecks.length})
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] w-fit">
                <button
                  type="button"
                  onClick={() => setFilterTab('active')}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
                    filterTab === 'active'
                      ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  All ({activeDecks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('due')}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
                    filterTab === 'due'
                      ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Due ({dueDecks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('archived')}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all cursor-pointer ${
                    filterTab === 'archived'
                      ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Archived ({archivedDecks.length})
                </button>
              </div>
            </div>

            {/* Decks Grid or Empty State */}
            {displayedDecks.length === 0 ? (
              <div className="text-center py-12 px-6 border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
                <div className="text-[40px] mb-2 select-none">
                  {filterTab === 'archived' ? '📦' : filterTab === 'due' ? '🎉' : '📚'}
                </div>
                <h3 className="text-[17px] font-bold text-[var(--color-text)] mb-1">
                  {filterTab === 'archived'
                    ? 'No archived decks'
                    : filterTab === 'due'
                    ? 'All caught up on due reviews!'
                    : 'No study decks yet'}
                </h3>
                <p className="text-[13px] text-[var(--color-text-secondary)] max-w-sm mx-auto mb-5">
                  {filterTab === 'archived'
                    ? 'Decks you archive will appear here so you can revisit or restore them anytime.'
                    : filterTab === 'due'
                    ? 'All scheduled cards are completed. Switch to Cram mode anytime to review ahead.'
                    : 'Create your first deck by uploading study notes, lecture slides, or pasting text.'}
                </p>
                {filterTab === 'active' && (
                  <Link href="/decks/new">
                    <Button variant="primary" size="sm">
                      + Create First Deck
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="group flex flex-col justify-between p-4 sm:p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)] transition-all duration-200"
                    >
                      <div className="space-y-3">
                        {/* Source Tag & Due status */}
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
                                Up to date
                              </Badge>
                            )}

                            {/* Archive Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleArchive(deck.id, Boolean(deck.isArchived));
                              }}
                              title={deck.isArchived ? 'Restore deck' : 'Archive deck'}
                              aria-label={deck.isArchived ? 'Restore deck' : 'Archive deck'}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="5" x="2" y="3" rx="1" />
                                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                                <path d="m10 12 2 2 2-2" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={deletingId === deck.id}
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteDeck(deck.id, deck.title);
                              }}
                              title="Delete deck permanently"
                              aria-label="Delete deck permanently"
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Deck Title */}
                        <div>
                          <Link href={`/decks/${deck.id}`}>
                            <h3 className="text-[17px] font-bold text-[var(--color-text)] group-hover:opacity-75 transition-opacity leading-snug line-clamp-1">
                              {deck.title}
                            </h3>
                          </Link>
                          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                            {s.totalCards} cards · {s.masteredCount} mastered
                          </p>
                        </div>

                        {/* Retention Progress Bar */}
                        <MasteryBar percent={masteryPercent} />

                        {/* Star Rating */}
                        <div className="flex items-center gap-1.5">
                          <StarRating count={stars} />
                          <span className="text-[11px] text-[var(--color-text-tertiary)]">
                            {masteryPercent >= 66
                              ? 'High stability'
                              : masteryPercent >= 33
                              ? 'Building retention'
                              : 'New cards'}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                        <Link href={`/decks/${deck.id}/review?mode=mastery`} className="flex-1">
                          <Button variant="primary" size="sm" className="w-full text-[13px]">
                            {s.dueNow > 0 ? `Review (${s.dueNow})` : 'Review Deck'}
                          </Button>
                        </Link>
                        <Link href={`/decks/${deck.id}/review?mode=cram`}>
                          <Button variant="secondary" size="sm" className="text-[13px]">
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
        </div>

        {/* ── Right Column: Study Companion & Goals Sidebar (4 cols) ─────────── */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Daily Goal Card */}
          <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Daily Goal
              </h3>
              {mounted && currentStats && (
                <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  {currentStats.todayStudiedCount} / {currentStats.dailyGoal} cards
                </span>
              )}
            </div>

            <div className="h-2.5 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-text)] transition-all duration-700"
                style={{ width: `${dailyGoalPercent}%` }}
              />
            </div>

            <p className="text-[12px] text-[var(--color-text-secondary)] leading-snug">
              {dailyGoalPercent >= 100
                ? '🎉 Excellent work! You completed your daily study goal.'
                : 'Review cards consistently every day to maximize memory stability.'}
            </p>
          </section>

          {/* Student Study Rhythm Metrics */}
          {mounted && currentStats && (
            <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Study Rhythm
                </h3>
                <Link
                  href="/profile"
                  className="text-[12px] font-semibold text-[var(--color-text)] hover:underline"
                >
                  Profile →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Streak */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                  <span className="text-[18px]">🔥</span>
                  <span className="text-[18px] font-bold text-[var(--color-text)] mt-1">
                    {currentStats.streak}d
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Day Streak</span>
                </div>

                {/* Level */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                  <span className="text-[18px]">⚡</span>
                  <span className="text-[18px] font-bold text-[var(--color-text)] mt-1">
                    Lv. {currentStats.level}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)] truncate">
                    {currentStats.title}
                  </span>
                </div>

                {/* Stars */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                  <span className="text-[18px]">⭐</span>
                  <span className="text-[18px] font-bold text-[var(--color-text)] mt-1">
                    {currentStats.totalStars}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Stars Earned</span>
                </div>

                {/* Total Cards */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                  <span className="text-[18px]">📚</span>
                  <span className="text-[18px] font-bold text-[var(--color-text)] mt-1">
                    {currentStats.totalCardsReviewed}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Reviewed</span>
                </div>
              </div>
            </section>
          )}

          {/* Spaced Repetition Science Insight */}
          <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">⏱️</span>
              <h3 className="text-[13px] font-bold text-[var(--color-text)]">
                FSRS Spaced Repetition
              </h3>
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Cards adapt in real-time based on memory stability and your rating feedback (Again, Hard, Good, Easy). Studying just before you forget builds the strongest neural traces.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
