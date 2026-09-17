/**
 * /types/index.ts — SHARED CONTRACT
 *
 * This is the single source of truth for all shared types across the
 * Cadence project. Every track imports from here.
 *
 * ⚠️  NEVER redefine these types locally in a track.
 * ⚠️  NEVER edit this file mid-project without:
 *       1. Adding a Change Log entry below.
 *       2. Notifying all 3 track chats of the breaking change.
 *
 * Change Log:
 *   v0 (Phase 0) — Initial types, established as contract.
 */

export type ReviewMode = 'cram' | 'mastery';
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type CardType = 'basic' | 'cloze' | 'mcq';

export interface Deck {
  id: string;
  title: string;
  sourceType: 'pdf' | 'text' | 'image';
  createdAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string;
  back: string;
  explanation?: string;
  options?: string[];        // for mcq type only
  // FSRS scheduling fields
  due: string;               // ISO date, when this card is next due
  stability: number;
  difficulty: number;
  lastReviewed?: string;
  reps: number;
}

/**
 * CardPayload — what the AI generates.
 * Omits DB-managed fields: id, deckId, due, stability, difficulty, lastReviewed, reps.
 * explanation is required here (R-04), optional on Card for legacy rows.
 */
export interface CardPayload {
  type: CardType;
  front: string;
  back: string;
  explanation: string;        // required — R-04
  options?: string[];         // required for mcq, absent for basic/cloze
}

export interface ReviewLogEntry {
  cardId: string;
  timestamp: string;
  rating: Rating;
  confidenceBefore?: 1 | 2 | 3 | 4 | 5;
}

export interface ReviewSession {
  id: string;
  deckId: string;
  mode: ReviewMode;
  startedAt: string;
  completedAt?: string;
  log: ReviewLogEntry[];
}

export interface DeckStats {
  deckId: string;
  totalCards: number;
  dueNow: number;
  masteredCount: number;
  accuracyLast7Days: number;
}
