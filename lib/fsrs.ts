/**
 * /lib/fsrs.ts — FSRS Scheduling Engine
 *
 * Wraps ts-fsrs to provide:
 *   - scheduleCard(card, rating): Card    — update a card after a review
 *   - getMasteryQueue(deckId): Card[]     — due cards, soonest first
 *   - getCramQueue(deckId, limit): Card[] — high-yield cram session cards
 *
 * Owner: Chat 2 — Backend
 */

import { fsrs, Rating as FsrsRating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { Card, Rating } from '@/types';
import { prisma } from '@/lib/db';

// ─────────────────────────────────────────────
// Constants (tune here, not in algorithm code)
// ─────────────────────────────────────────────

/**
 * A card is considered "mastered" when its stability reaches this many days.
 * Rationale: FSRS stability = days until 90% retention probability. 21 days
 * (≈3 weeks) is the FSRS community's conventional "graduated" threshold —
 * conservative enough to exclude cards still in early learning.
 */
export const MASTERY_STABILITY_DAYS = 21;

/**
 * Default number of cards returned by getCramQueue.
 */
const CRAM_DEFAULT_LIMIT = 20;

// ─────────────────────────────────────────────
// FSRS instance (daily scheduling mode)
// ─────────────────────────────────────────────

const f = fsrs({
  enable_short_term: false,
});

// ─────────────────────────────────────────────
// Rating mapping
// ─────────────────────────────────────────────

const RATING_MAP: Record<Rating, Grade> = {
  again: FsrsRating.Again as Grade,
  hard: FsrsRating.Hard as Grade,
  good: FsrsRating.Good as Grade,
  easy: FsrsRating.Easy as Grade,
};

// ─────────────────────────────────────────────
// Type helpers
// ─────────────────────────────────────────────

/** Convert a Card (or DB row) to the ts-fsrs Card shape. */
function toFsrsCard(card: {
  due: Date;
  stability: number;
  difficulty: number;
  lastReviewed: Date | null;
  reps: number;
  lapses?: number;
  state?: string;
  scheduledDays?: number;
  learningSteps?: number;
}): FsrsCard {
  const isNew = card.reps === 0 || card.stability === 0;

  return {
    due: card.due,
    stability: isNew ? 0 : Math.max(0.1, card.stability),
    difficulty: isNew ? 0 : Math.max(1, Math.min(10, card.difficulty || 5.0)),
    elapsed_days: 0,
    scheduled_days: card.scheduledDays ?? 0,
    learning_steps: card.learningSteps ?? 0,
    reps: card.reps,
    lapses: card.lapses ?? 0,
    state: isNew ? State.New : State.Review,
    last_review: card.lastReviewed ?? undefined,
  };
}

/** Map a Prisma Card row to the shared Card type (omits internal fields). */
export function mapToSharedCard(row: {
  id: string;
  deckId: string;
  type: string;
  front: string;
  back: string;
  explanation: string | null;
  options: string | null;
  due: Date;
  stability: number;
  difficulty: number;
  lastReviewed: Date | null;
  reps: number;
  createdAt?: Date;
}): Card {
  return {
    id: row.id,
    deckId: row.deckId,
    type: row.type as Card['type'],
    front: row.front,
    back: row.back,
    explanation: row.explanation ?? undefined,
    options: row.options ? (JSON.parse(row.options) as string[]) : undefined,
    due: row.due.toISOString(),
    stability: row.stability,
    difficulty: row.difficulty,
    lastReviewed: row.lastReviewed?.toISOString(),
    reps: row.reps,
  };
}

// ─────────────────────────────────────────────
// Core scheduling function
// ─────────────────────────────────────────────

/**
 * Schedule a card after a review.
 *
 * Takes the current Card (shared type) and a rating, runs it through FSRS,
 * and returns an updated Card with new `due`, `stability`, `difficulty`,
 * `lastReviewed`, and `reps`.
 *
 * REQ-007, REQ-008, REQ-009
 */
export function scheduleCard(card: Card, rating: Rating): Card {
  const now = new Date();
  const fsrsCard = toFsrsCard({
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : null,
    reps: card.reps,
  });

  const grade = RATING_MAP[rating];
  const result = f.next(fsrsCard, now, grade);
  const updated = result.card;

  return {
    ...card,
    due: updated.due.toISOString(),
    stability: Number(updated.stability.toFixed(4)),
    difficulty: Number(updated.difficulty.toFixed(4)),
    lastReviewed: now.toISOString(),
    reps: updated.reps,
  };
}

// ─────────────────────────────────────────────
// Queue functions
// ─────────────────────────────────────────────

/**
 * Returns cards that are due for review right now, ordered soonest-due first.
 * This is the "Mastery" mode queue — show what FSRS says needs review.
 *
 * REQ-005
 */
export async function getMasteryQueue(deckId: string): Promise<Card[]> {
  const now = new Date();
  const rows = await prisma.card.findMany({
    where: {
      deckId,
      due: { lte: now },
    },
    orderBy: { due: 'asc' },
  });
  return rows.map(mapToSharedCard);
}

/**
 * Returns the top N cards ranked by cram score for a compressed high-yield
 * study session (exam tonight? use this).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  CRAM SCORE FORMULA — product decision, adjust weights here to retune.  │
 * │                                                                         │
 * │    cramScore = (D × difficultyWeight) / (S × stabilityWeight + 1)      │
 * │                                                                         │
 * │  Where:                                                                 │
 * │    D = difficulty  (ts-fsrs param, 1–10; higher = harder to learn)     │
 * │    S = stability   (days to 90% retention; higher = better retained)   │
 * │    difficultyWeight = 1.0  — how much "inherently hard" matters        │
 * │    stabilityWeight  = 1.0  — how much "already retained" penalises     │
 * │    +1                      — prevents ÷0 for brand-new cards (S = 0)   │
 * │                                                                         │
 * │  Rationale: In a cram session (limited time, exam soon), the best card  │
 * │  to drill is one that is BOTH objectively hard AND not well retained.   │
 * │  High-D + High-S = already knows it despite difficulty → low priority.  │
 * │  Low-D + Low-S = easy to re-learn quickly → lower priority than risky. │
 * │  The ratio surfaces the intersection of "risky AND forgotten."          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * REQ-006
 */
export async function getCramQueue(deckId: string, limit: number = CRAM_DEFAULT_LIMIT): Promise<Card[]> {
  const difficultyWeight = 1.0;
  const stabilityWeight = 1.0;

  const rows = await prisma.card.findMany({
    where: { deckId },
  });

  const scored = rows.map((row) => ({
    row,
    score: (row.difficulty * difficultyWeight) / (row.stability * stabilityWeight + 1),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ row }) => mapToSharedCard(row));
}

// ─────────────────────────────────────────────
// Review submit helper
// ─────────────────────────────────────────────

/**
 * Run FSRS on a Prisma card row, update card fields, and write ReviewLogEntry.
 */
export async function scheduleAndPersistCard(
  cardId: string,
  rating: Rating,
  confidenceBefore?: number,
): Promise<Card> {
  const row = await prisma.card.findUniqueOrThrow({ where: { id: cardId } });

  const fsrsCard = toFsrsCard(row);
  const now = new Date();
  const grade = RATING_MAP[rating];
  const result = f.next(fsrsCard, now, grade);
  const updated = result.card;
  const log = result.log;

  const elapsedDays = row.lastReviewed
    ? (now.getTime() - row.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const [updatedRow] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: {
        due: updated.due,
        stability: updated.stability,
        difficulty: updated.difficulty,
        lastReviewed: now,
        reps: updated.reps,
        lapses: updated.lapses,
        state: State[updated.state],
        scheduledDays: updated.scheduled_days,
        learningSteps: updated.learning_steps,
      },
    }),
    prisma.reviewLogEntry.create({
      data: {
        cardId,
        deckId: row.deckId,
        rating,
        confidenceBefore: confidenceBefore ?? null,
        reviewedAt: now,
        scheduledDays: log.scheduled_days,
        elapsedDays,
      },
    }),
  ]);

  return mapToSharedCard(updatedRow);
}
