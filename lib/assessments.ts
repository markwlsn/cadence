/**
 * /lib/assessments.ts — Structured Linear Assessment Engine
 *
 * Implements the academic assessment curriculum for decks:
 * 1. Foundational Quizzes: Quiz 1, Quiz 2, Quiz 3 (Core Recall & Terminology)
 * 2. Synthesis Long Quizzes: Long Quiz 1, Long Quiz 2 (Mid-Unit & Advanced Review)
 * 3. Comprehensive Exam: 35-item mock exam covering the full curriculum
 */

import type { Card } from '@/types';

export type AssessmentTier = 'quiz' | 'long-quiz' | 'exam';

export interface DeckAssessment {
  id: string;
  title: string;
  subtitle: string;
  tier: AssessmentTier;
  targetCount: number;
  estimatedMinutes: number;
  description: string;
}

export interface AssessmentProgress {
  assessmentId: string;
  completed: boolean;
  score: number; // 0–100
  correctCount: number;
  totalCount: number;
  lastAttemptDate?: string;
}

export const ASSESSMENT_CONFIGS: Omit<DeckAssessment, 'targetCount' | 'estimatedMinutes'>[] = [
  {
    id: 'quiz-1',
    title: 'Quiz 1',
    subtitle: 'Foundational Recall & Core Concepts',
    tier: 'quiz',
    description: 'Quick check of core definitions and fundamental relationships.',
  },
  {
    id: 'quiz-2',
    title: 'Quiz 2',
    subtitle: 'Mechanisms & System Flow',
    tier: 'quiz',
    description: 'Focuses on step-by-step mechanisms, processes, and causal links.',
  },
  {
    id: 'quiz-3',
    title: 'Quiz 3',
    subtitle: 'Applied Concepts & Distinctions',
    tier: 'quiz',
    description: 'Tests conceptual differences, problem cases, and practical recall.',
  },
  {
    id: 'long-quiz-1',
    title: 'Long Quiz 1',
    subtitle: 'Section 1 Synthesis & Mid-Review',
    tier: 'long-quiz',
    description: 'Integrates topics from Quizzes 1 and 2 to build deeper retention.',
  },
  {
    id: 'long-quiz-2',
    title: 'Long Quiz 2',
    subtitle: 'Section 2 Synthesis & Advanced Topics',
    tier: 'long-quiz',
    description: 'Combines advanced mechanisms and comparative question structures.',
  },
  {
    id: 'exam-35',
    title: 'Comprehensive Exam (35 items)',
    subtitle: 'Full Deck Mastery Assessment',
    tier: 'exam',
    description: 'Full simulation covering the entire syllabus to verify exam-readiness.',
  },
];

/**
 * Returns the configured assessments adapted to the deck's card count.
 */
export function getDeckAssessments(totalCards: number): DeckAssessment[] {
  const safeTotal = Math.max(totalCards, 1);

  return [
    {
      ...ASSESSMENT_CONFIGS[0],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.2))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[1],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.2))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[2],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.2))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[3],
      targetCount: Math.min(12, Math.max(2, Math.ceil(safeTotal * 0.45))),
      estimatedMinutes: 12,
    },
    {
      ...ASSESSMENT_CONFIGS[4],
      targetCount: Math.min(15, Math.max(2, Math.ceil(safeTotal * 0.5))),
      estimatedMinutes: 15,
    },
    {
      ...ASSESSMENT_CONFIGS[5],
      title: safeTotal >= 35 ? 'Comprehensive Exam (35 items)' : `Comprehensive Exam (${safeTotal} items)`,
      targetCount: Math.min(35, safeTotal),
      estimatedMinutes: Math.min(35, Math.max(10, Math.round(safeTotal * 1.2))),
    },
  ];
}

/**
 * Slices and selects cards deterministically for a specific assessment.
 */
export function getAssessmentCards(cards: Card[], assessmentId: string): Card[] {
  if (!cards || cards.length === 0) return [];
  const n = cards.length;

  switch (assessmentId) {
    case 'quiz-1': {
      // First 5 cards (or first 20%)
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.2)));
      return cards.slice(0, count);
    }
    case 'quiz-2': {
      // Next 5 cards (or next 20%)
      const start = Math.min(n - 1, Math.max(1, Math.floor(n * 0.2)));
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.2)));
      const slice = cards.slice(start, start + count);
      return slice.length > 0 ? slice : cards.slice(0, count);
    }
    case 'quiz-3': {
      // Third 5 cards (or next 20%)
      const start = Math.min(n - 1, Math.max(1, Math.floor(n * 0.4)));
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.2)));
      const slice = cards.slice(start, start + count);
      return slice.length > 0 ? slice : cards.slice(0, count);
    }
    case 'long-quiz-1': {
      // First half synthesis (up to 12 items)
      const half = Math.max(2, Math.ceil(n * 0.5));
      const count = Math.min(12, half);
      return cards.slice(0, count);
    }
    case 'long-quiz-2': {
      // Second half synthesis (up to 15 items)
      const start = Math.floor(n * 0.4);
      const slice = cards.slice(start, start + 15);
      return slice.length >= 3 ? slice : cards.slice(0, Math.min(15, n));
    }
    case 'exam-35':
    default: {
      // Comprehensive exam: up to 35 items
      if (n <= 35) return [...cards];
      // Deterministically pick 35 items evenly spaced across the deck
      const step = n / 35;
      const picked: Card[] = [];
      for (let i = 0; i < 35; i++) {
        const idx = Math.min(n - 1, Math.floor(i * step));
        picked.push(cards[idx]);
      }
      return picked;
    }
  }
}

/**
 * Storage helpers for local progress tracking.
 */
function getStorageKey(deckId: string): string {
  return `cadence_assessments_${deckId}`;
}

export function getDeckAssessmentProgress(deckId: string): Record<string, AssessmentProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey(deckId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAssessmentProgress(
  deckId: string,
  assessmentId: string,
  correctCount: number,
  totalCount: number
): AssessmentProgress {
  if (typeof window === 'undefined') {
    return {
      assessmentId,
      completed: true,
      score: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
      correctCount,
      totalCount,
    };
  }

  const existing = getDeckAssessmentProgress(deckId);
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const updated: AssessmentProgress = {
    assessmentId,
    completed: true,
    score,
    correctCount,
    totalCount,
    lastAttemptDate: new Date().toISOString(),
  };

  existing[assessmentId] = updated;

  try {
    localStorage.setItem(getStorageKey(deckId), JSON.stringify(existing));
    window.dispatchEvent(
      new CustomEvent('cadence_assessment_updated', {
        detail: { deckId, assessmentId, progress: updated },
      })
    );
  } catch (err) {
    console.error('Failed to save assessment progress:', err);
  }

  return updated;
}

/**
 * Returns the next assessment in the linear path, or null if complete.
 */
export function getNextAssessmentId(currentId: string): string | null {
  const order = ['quiz-1', 'quiz-2', 'quiz-3', 'long-quiz-1', 'long-quiz-2', 'exam-35'];
  const currentIndex = order.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1];
}
