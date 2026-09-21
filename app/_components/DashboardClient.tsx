'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { deleteDeck, archiveDeck, getLocalCustomDecks, getLocalCustomCards } from '@/lib/data';
import { Badge, Button } from '@/components/ui';
import type { Deck, DeckStats } from '@/types';
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

function MasteryBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
        <span>Retention Stability</span>
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
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');
  const [deckList, setDeckList] = useState<Deck[]>(decks);
  const [filterTab, setFilterTab] = useState<'active' | 'due' | 'archived'>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build statsMap from serialised entries
  const [statsMap, setStatsMap] = useState<Map<string, DeckStats>>(() => new Map<string, DeckStats>(statsEntries));

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    setUser(getCurrentUser());

    const custom = getLocalCustomDecks();
    if (custom.length > 0) {
      setDeckList((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const newDecks = custom.filter((d) => !existingIds.has(d.id));
        return [...newDecks, ...prev];
      });
      setStatsMap((prevMap) => {
        const nextMap = new Map(prevMap);
        for (const d of custom) {
          if (!nextMap.has(d.id)) {
            const cards = getLocalCustomCards(d.id);
            const now = new Date().toISOString();
            nextMap.set(d.id, {
              deckId: d.id,
              totalCards: cards.length,
              dueNow: cards.filter((c) => c.due <= now).length,
              masteredCount: cards.filter((c) => c.stability >= 21).length,
              accuracyLast7Days: 1.0,
            });
          }
        }
        return nextMap;
      });
    }

    const handleAuth = (e: CustomEvent) => setUser(e.detail as User);
    window.addEventListener('cadence_auth_updated', handleAuth as EventListener);
    return () => {
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

  const totalCardsAllDecks = activeDecks.reduce((sum, deck) => {
    const s = statsMap.get(deck.id);
    return sum + (s?.totalCards || 0);
  }, 0);

  const totalMasteredAllDecks = activeDecks.reduce((sum, deck) => {
    const s = statsMap.get(deck.id);
    return sum + (s?.masteredCount || 0);
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

  const displayName = mounted && user ? user.name.split(' ')[0] : 'Student';

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:py-8 space-y-8">
      {/* ── 1. Clean Apple Reviewer Header ───────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[var(--color-text)] leading-tight">
            {greeting}, {displayName}!
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {totalDueCards > 0
              ? `You have ${totalDueCards} question${totalDueCards === 1 ? '' : 's'} scheduled for spaced repetition review across ${dueDecks.length} deck${dueDecks.length === 1 ? '' : 's'}.`
              : activeDecks.length > 0
              ? 'All scheduled active recall reviews are up to date.'
              : 'Welcome to Cadence. Upload your notes to generate your first structured study curriculum.'}
          </p>
        </div>

        {/* Quick Review / Create Action */}
        <div className="flex items-center gap-3 shrink-0">
          {totalDueCards > 0 && primaryReviewDeck ? (
            <Link href={`/decks/${primaryReviewDeck.id}/review?mode=mastery`}>
              <Button variant="primary" size="md" className="shadow-[var(--shadow-sm)]">
                Start Due Review ({totalDueCards})
              </Button>
            </Link>
          ) : (
            <Link href="/decks/new">
              <Button variant="primary" size="md" className="shadow-[var(--shadow-sm)]">
                ✨ Synthesize Notes with AI
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
                    Linear Curriculum
                  </span>
                </div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                  Drop lecture PDFs, photos of notes, or paste text. Cadence formats an organized learning sequence: Quiz 1, 2, 3, Long Quizzes, and a 35-item Comprehensive Exam.
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
                            {s.totalCards} total questions · {s.masteredCount} mastered
                          </p>
                        </div>

                        {/* Retention Progress Bar */}
                        <MasteryBar percent={masteryPercent} />

                        {/* Linear Assessment Curriculum Tag */}
                        <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)] font-medium">
                          <span>📋</span>
                          <span>3 Quizzes · 2 Long Quizzes · 1 Exam</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                        <Link href={`/decks/${deck.id}`} className="flex-1">
                          <Button variant="primary" size="sm" className="w-full text-[13px] font-semibold">
                            Open Curriculum →
                          </Button>
                        </Link>
                        <Link href={`/decks/${deck.id}/review?mode=mastery`}>
                          <Button variant="secondary" size="sm" className="text-[13px]">
                            {s.dueNow > 0 ? `Review (${s.dueNow})` : 'Practice'}
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

        {/* ── Right Column: Academic Curriculum Overview Sidebar (4 cols) ─────── */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Assessment Architecture Card */}
          <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Assessment Architecture
              </h3>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text)]">
                Linear
              </span>
            </div>

            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Every study deck is structured into an academic assessment pathway to eliminate random memorization:
            </p>

            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <span className="text-[12px] font-bold text-[var(--color-text)] block">
                  1. Short Quizzes (1, 2, 3)
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  ~5 items each: Core terminology, mechanisms, and distinctions.
                </span>
              </div>

              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <span className="text-[12px] font-bold text-[var(--color-text)] block">
                  2. Long Quizzes (1, 2)
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  ~12–15 items each: Multi-concept synthesis and comparative review.
                </span>
              </div>

              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                <span className="text-[12px] font-bold text-[var(--color-text)] block">
                  3. Comprehensive Exam (35 items)
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Full deck simulation under real testing conditions.
                </span>
              </div>
            </div>
          </section>

          {/* Academic Overview Metrics */}
          <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Study Progress
              </h3>
              {mounted && user?.isGuest ? (
                <Link
                  href="/register"
                  className="text-[12px] font-semibold text-[var(--color-text)] hover:underline"
                >
                  Register →
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="text-[12px] font-semibold text-[var(--color-text)] hover:underline"
                >
                  Account →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Active Decks */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                <span className="text-[18px] font-bold text-[var(--color-text)]">
                  {activeDecks.length}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">Active Decks</span>
              </div>

              {/* Total Questions */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                <span className="text-[18px] font-bold text-[var(--color-text)]">
                  {totalCardsAllDecks}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">Questions</span>
              </div>

              {/* Mastered */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                <span className="text-[18px] font-bold text-[var(--color-success)]">
                  {totalMasteredAllDecks}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">Mastered</span>
              </div>

              {/* Due Today */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col">
                <span className="text-[18px] font-bold text-[var(--color-text)]">
                  {totalDueCards}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">Due Today</span>
              </div>
            </div>
          </section>

          {/* Spaced Repetition Science Insight */}
          <section className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">⏱️</span>
              <h3 className="text-[13px] font-bold text-[var(--color-text)]">
                FSRS Spaced Repetition
              </h3>
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              Cards adapt in real-time based on memory stability and your rating feedback (Again, Hard, Good, Easy). Reviewing right before memory decay produces the highest retention.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
