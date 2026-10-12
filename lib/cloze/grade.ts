/**
 * lib/cloze/grade.ts
 *
 * Dedicated Cloze Deletion & Fill-In-The-Blank Grading Service.
 * Reuses core metric algorithms from lib/utils/levenshtein.ts to avoid duplication.
 *
 * Responsibilities:
 *  - Categorization into 'exact' (green), 'close' (amber), and 'wrong' (red)
 *  - FSRS rating recommendation: exact -> Good, close -> Hard, wrong -> Again
 *  - Diff / discrepancy indexing for amber close-typo rendering
 *  - Configurable evaluation options (strict mode)
 */

import {
  levenshteinDistance,
  stringSimilarity,
  normalizeAnswer,
} from '../utils/levenshtein';

export type ClozeMatchCategory = 'exact' | 'close' | 'wrong';

export interface ClozeGradingOptions {
  /** If true, requires exact match and rejects any typo distance */
  strict?: boolean;
}

export interface ClozeDiffHighlight {
  expected: string;
  received: string;
  diffIndex: number;
}

export interface ClozeGradeResult {
  isCorrect: boolean;
  category: ClozeMatchCategory;
  matchType: 'exact' | 'typo' | 'incorrect';
  score: number;
  similarity: number;
  distance: number;
  suggestedRating: 'good' | 'hard' | 'again';
  message: string;
  diff?: ClozeDiffHighlight;
}

/**
 * Strips unicode accent and diacritical marks.
 */
export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Computes the first index where two strings differ for visual diff highlighting.
 */
export function findFirstDiffIndex(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) return i;
  }
  return minLen;
}

/**
 * Main grading function for student cloze input against an expected answer.
 * Integrates with Cadence's FSRS spaced repetition engine.
 */
export function gradeClozeAnswer(
  studentInput: string,
  expectedAnswer: string,
  options: ClozeGradingOptions = {}
): ClozeGradeResult {
  const normStudent = normalizeAnswer(studentInput);
  const normExpected = normalizeAnswer(expectedAnswer);

  if (!normStudent || !normExpected) {
    return {
      isCorrect: false,
      category: 'wrong',
      matchType: 'incorrect',
      score: 0,
      similarity: 0,
      distance: Math.max(normStudent.length, normExpected.length),
      suggestedRating: 'again',
      message: 'No answer provided.',
    };
  }

  // 1. Exact match (case & punctuation normalized)
  if (normStudent === normExpected) {
    return {
      isCorrect: true,
      category: 'exact',
      matchType: 'exact',
      score: 1.0,
      similarity: 1.0,
      distance: 0,
      suggestedRating: 'good',
      message: 'Spot on! Excellent active recall.',
    };
  }

  // 2. Code spacing tolerance (e.g., `x == y` matches `x==y` or `a + b` matches `a+b`)
  const compactStudent = normStudent.replace(/\s+/g, '');
  const compactExpected = normExpected.replace(/\s+/g, '');
  if (compactStudent === compactExpected) {
    return {
      isCorrect: true,
      category: 'exact',
      matchType: 'exact',
      score: 1.0,
      similarity: 1.0,
      distance: 0,
      suggestedRating: 'good',
      message: 'Exact match (syntax spacing normalized)',
    };
  }

  // Core metrics from levenshtein.ts
  const distance = levenshteinDistance(normStudent, normExpected);
  const similarity = stringSimilarity(normStudent, normExpected);
  const diffIndex = findFirstDiffIndex(normStudent, normExpected);
  const diffHighlight: ClozeDiffHighlight = {
    expected: expectedAnswer,
    received: studentInput,
    diffIndex,
  };

  // If strict mode is enabled, reject any difference
  if (options.strict) {
    return {
      isCorrect: false,
      category: 'wrong',
      matchType: 'incorrect',
      score: 0,
      similarity,
      distance,
      suggestedRating: 'again',
      message: 'Exact match required in strict evaluation mode.',
      diff: diffHighlight,
    };
  }

  // 3. Diacritic / Accent tolerance (e.g. `corazon` vs `corazón`)
  if (stripDiacritics(normStudent) === stripDiacritics(normExpected)) {
    return {
      isCorrect: true,
      category: 'close',
      matchType: 'typo',
      score: 0.95,
      similarity: Math.max(similarity, 0.95),
      distance,
      suggestedRating: 'hard',
      message: 'Correct concept! (Watch out for accent marks)',
      diff: diffHighlight,
    };
  }

  // 4. Short terms (<= 3 chars): strictly require exact match (e.g., ATP vs ADP, RNA vs DNA)
  if (normExpected.length <= 3) {
    return {
      isCorrect: false,
      category: 'wrong',
      matchType: 'incorrect',
      score: 0,
      similarity,
      distance,
      suggestedRating: 'again',
      message: 'Exact match required for short terms.',
      diff: diffHighlight,
    };
  }

  // 5. Medium terms (4-6 chars): allow max 1 edit distance if similarity >= 0.75
  if (normExpected.length <= 6 && distance <= 1 && similarity >= 0.75) {
    return {
      isCorrect: true,
      category: 'close',
      matchType: 'typo',
      score: 0.9,
      similarity,
      distance,
      suggestedRating: 'hard',
      message: `Minor typo (${studentInput} → ${expectedAnswer})`,
      diff: diffHighlight,
    };
  }

  // 6. Long terms (7+ chars): allow max 2 edit distance or similarity >= 0.82
  if (normExpected.length >= 7 && (distance <= 2 || similarity >= 0.82)) {
    return {
      isCorrect: true,
      category: 'close',
      matchType: 'typo',
      score: 0.85,
      similarity,
      distance,
      suggestedRating: 'hard',
      message: `Close match (${studentInput} → ${expectedAnswer})`,
      diff: diffHighlight,
    };
  }

  // Fallback: wrong
  return {
    isCorrect: false,
    category: 'wrong',
    matchType: 'incorrect',
    score: 0,
    similarity,
    distance,
    suggestedRating: 'again',
    message: 'Not quite. Check the model answer below.',
    diff: diffHighlight,
  };
}
