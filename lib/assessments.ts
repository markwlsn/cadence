/**
 * /lib/assessments.ts — Structured Linear Assessment Engine (100% Multiple Choice Standard)
 *
 * Implements the academic assessment curriculum for decks:
 * 1. 4 Short Quizzes: Quiz 1, Quiz 2, Quiz 3, Quiz 4 (Foundational Recall & Applied Distinctions)
 * 2. 2 Long Quizzes: Long Quiz 1, Long Quiz 2 (Mid-Unit & Advanced Synthesis)
 * 3. 1 Comprehensive Exam: 35-item mock exam covering the full curriculum
 *
 * All assessments adhere strictly to the 4-choice Multiple Choice standard (`type: 'mcq'`).
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
    description: 'Multiple-choice check of core definitions, terminology, and baseline relationships.',
  },
  {
    id: 'quiz-2',
    title: 'Quiz 2',
    subtitle: 'Mechanisms & System Dynamics',
    tier: 'quiz',
    description: 'Multiple-choice questions focusing on step-by-step processes and causal links.',
  },
  {
    id: 'quiz-3',
    title: 'Quiz 3',
    subtitle: 'Comparative Distinctions & Models',
    tier: 'quiz',
    description: 'Tests conceptual differences, classification, and discriminating features.',
  },
  {
    id: 'quiz-4',
    title: 'Quiz 4',
    subtitle: 'Applied Scenarios & Edge Cases',
    tier: 'quiz',
    description: 'Evaluates problem situations, boundary conditions, and practical application.',
  },
  {
    id: 'long-quiz-1',
    title: 'Long Quiz 1',
    subtitle: 'Section 1 & 2 Synthesis Review',
    tier: 'long-quiz',
    description: 'Integrates topics from Quizzes 1 and 2 to build deep multi-concept retention.',
  },
  {
    id: 'long-quiz-2',
    title: 'Long Quiz 2',
    subtitle: 'Section 3 & 4 Synthesis Review',
    tier: 'long-quiz',
    description: 'Combines advanced mechanisms and comparative question structures across Sections 3 & 4.',
  },
  {
    id: 'exam-35',
    title: 'Comprehensive Exam (35 items)',
    subtitle: 'Full Deck Mastery Assessment',
    tier: 'exam',
    description: 'Full simulation covering the entire syllabus to verify complete exam-readiness.',
  },
];

/**
 * Normalizes any card into a strict 4-choice Multiple Choice Question (MCQ).
 * Pulls plausible distractors from the deck to ensure 100% MCQ standardization.
 */
export function ensureMultipleChoice(card: Card, allCards: Card[] = [], seed = 0): Card {
  const correct = (card.back || '').trim();

  // If already MCQ with 4 options and back matches one of them, return it
  if (
    card.type === 'mcq' &&
    Array.isArray(card.options) &&
    card.options.length >= 4
  ) {
    const hasCorrect = card.options.some(
      (opt) => opt.trim().toLowerCase() === correct.toLowerCase()
    );
    if (hasCorrect) {
      return {
        ...card,
        type: 'mcq',
        options: card.options.slice(0, 4),
      };
    }
  }

  // Gather candidate distractors from card options and other cards in the deck
  const candidatePool: string[] = [];
  if (card.options && Array.isArray(card.options)) {
    for (const opt of card.options) {
      if (opt && opt.trim() && opt.trim().toLowerCase() !== correct.toLowerCase()) {
        candidatePool.push(opt.trim());
      }
    }
  }

  for (const other of allCards) {
    if (other.id !== card.id) {
      if (other.back && other.back.trim() && other.back.trim().toLowerCase() !== correct.toLowerCase()) {
        candidatePool.push(other.back.trim());
      }
      if (Array.isArray(other.options)) {
        for (const opt of other.options) {
          if (opt && opt.trim() && opt.trim().toLowerCase() !== correct.toLowerCase()) {
            candidatePool.push(opt.trim());
          }
        }
      }
    }
  }

  // Deduplicate candidates
  const uniqueCandidates = Array.from(new Set(candidatePool));

  // Fallback academic distractors if deck has very few items
  const academicFallbacks = [
    'Directly inhibits upstream metabolic precursors',
    'Independent of membrane potential and ionic flux',
    'Occurs only during anaerobic conditions',
    'Requires non-enzymatic phosphorylation',
    'Inversely proportional to initial reactant concentration',
    'None of the stated physiological criteria apply',
  ];

  const distractors: string[] = [];
  // Use a pseudo-random seed based on card id or seed index for determinism
  let hash = 0;
  const key = `${card.id}-${seed}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  let poolIdx = positiveHash % Math.max(uniqueCandidates.length, 1);
  while (distractors.length < 3 && uniqueCandidates.length > 0) {
    const candidate = uniqueCandidates[poolIdx % uniqueCandidates.length];
    if (!distractors.includes(candidate) && candidate.toLowerCase() !== correct.toLowerCase()) {
      distractors.push(candidate);
    }
    poolIdx++;
    if (distractors.length === uniqueCandidates.length) break;
  }

  // If still need distractors, fill with academic fallbacks
  let fallbackIdx = positiveHash % academicFallbacks.length;
  while (distractors.length < 3) {
    const fb = academicFallbacks[fallbackIdx % academicFallbacks.length];
    if (!distractors.includes(fb) && fb.toLowerCase() !== correct.toLowerCase()) {
      distractors.push(fb);
    }
    fallbackIdx++;
  }

  // Deterministically place the correct answer into one of 4 slots (0..3)
  const targetSlot = positiveHash % 4;
  const fourOptions: string[] = [];
  let distractorCounter = 0;

  for (let i = 0; i < 4; i++) {
    if (i === targetSlot) {
      fourOptions.push(correct);
    } else {
      fourOptions.push(distractors[distractorCounter] || `Alternative distinction ${distractorCounter + 1}`);
      distractorCounter++;
    }
  }

  return {
    ...card,
    type: 'mcq',
    options: fourOptions,
  };
}

/**
 * Returns the configured assessments adapted to the deck's card count:
 * - 4 Short Quizzes
 * - 2 Long Quizzes
 * - 1 Comprehensive Exam (35 items)
 */
export function getDeckAssessments(totalCards: number): DeckAssessment[] {
  const safeTotal = Math.max(totalCards, 1);

  return [
    {
      ...ASSESSMENT_CONFIGS[0],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[1],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[2],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[3],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 5,
    },
    {
      ...ASSESSMENT_CONFIGS[4],
      targetCount: Math.min(12, Math.max(2, Math.ceil(safeTotal * 0.4))),
      estimatedMinutes: 12,
    },
    {
      ...ASSESSMENT_CONFIGS[5],
      targetCount: Math.min(15, Math.max(2, Math.ceil(safeTotal * 0.5))),
      estimatedMinutes: 15,
    },
    {
      ...ASSESSMENT_CONFIGS[6],
      title: safeTotal >= 35 ? 'Comprehensive Exam (35 items)' : `Comprehensive Exam (${safeTotal} items)`,
      targetCount: Math.min(35, safeTotal),
      estimatedMinutes: Math.min(35, Math.max(10, Math.round(safeTotal * 1.2))),
    },
  ];
}

/**
 * Slices and selects cards deterministically for a specific assessment.
 * Guarantees 100% of returned cards are Multiple Choice with 4 options.
 */
export function getAssessmentCards(cards: Card[], assessmentId: string): Card[] {
  if (!cards || cards.length === 0) return [];
  const n = cards.length;

  let selected: Card[] = [];

  switch (assessmentId) {
    case 'quiz-1': {
      // First 25% of deck (up to 5 items)
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.25)));
      selected = cards.slice(0, count);
      break;
    }
    case 'quiz-2': {
      // Second 25% of deck (up to 5 items)
      const start = Math.min(n - 1, Math.max(1, Math.floor(n * 0.25)));
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.25)));
      const slice = cards.slice(start, start + count);
      selected = slice.length > 0 ? slice : cards.slice(0, count);
      break;
    }
    case 'quiz-3': {
      // Third 25% of deck (up to 5 items)
      const start = Math.min(n - 1, Math.max(1, Math.floor(n * 0.5)));
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.25)));
      const slice = cards.slice(start, start + count);
      selected = slice.length > 0 ? slice : cards.slice(0, count);
      break;
    }
    case 'quiz-4': {
      // Fourth 25% of deck (up to 5 items)
      const start = Math.min(n - 1, Math.max(1, Math.floor(n * 0.75)));
      const count = Math.min(5, Math.max(1, Math.ceil(n * 0.25)));
      const slice = cards.slice(start, start + count);
      selected = slice.length > 0 ? slice : cards.slice(Math.max(0, n - count), n);
      break;
    }
    case 'long-quiz-1': {
      // First half synthesis (up to 12-15 items)
      const half = Math.max(2, Math.ceil(n * 0.5));
      const count = Math.min(15, half);
      selected = cards.slice(0, count);
      break;
    }
    case 'long-quiz-2': {
      // Second half synthesis (up to 15 items)
      const start = Math.floor(n * 0.4);
      const slice = cards.slice(start, start + 15);
      selected = slice.length >= 3 ? slice : cards.slice(0, Math.min(15, n));
      break;
    }
    case 'exam-35':
    case 'comprehensive_exam':
    default: {
      // Comprehensive exam: up to 35 items evenly spaced across deck
      if (n <= 35) {
        selected = [...cards];
      } else {
        const step = n / 35;
        const picked: Card[] = [];
        for (let i = 0; i < 35; i++) {
          const idx = Math.min(n - 1, Math.floor(i * step));
          picked.push(cards[idx]);
        }
        selected = picked;
      }
      break;
    }
  }

  // Standardize 100% of assessment cards to multiple choice
  return selected.map((c, idx) => ensureMultipleChoice(c, cards, idx));
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
  const order = ['quiz-1', 'quiz-2', 'quiz-3', 'quiz-4', 'long-quiz-1', 'long-quiz-2', 'exam-35'];
  const currentIndex = order.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1];
}
