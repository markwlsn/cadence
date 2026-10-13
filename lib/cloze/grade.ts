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
  matchedAnswer?: string;
}

/**
 * Splits expected cloze answer into accepted alternatives separated by "|".
 * Supports escaped pipes ("\\|") as literal pipe characters.
 * Trims whitespace and drops empty parts.
 */
export function splitAlternatives(raw: string): string[] {
  if (!raw) return [];
  const parts: string[] = [];
  let current = '';
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) {
      if (char === '|') {
        current += '|';
      } else {
        current += '\\' + char;
      }
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  if (escaped) {
    current += '\\';
  }
  const trimmed = current.trim();
  if (trimmed) {
    parts.push(trimmed);
  }

  return parts;
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
 * Evaluates student cloze input against a single expected alternative.
 */
function gradeSingleAlternative(
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
      matchedAnswer: expectedAnswer,
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
    matchedAnswer: expectedAnswer,
  };
}

/**
 * Main grading function for student cloze input against expected answer(s).
 * Supports pipe-separated alternative answers ("a|b") or an array of alternatives.
 * Integrates with Cadence's FSRS spaced repetition engine.
 */
export function gradeClozeAnswer(
  studentInput: string,
  expectedAnswer: string | string[],
  options: ClozeGradingOptions = {}
): ClozeGradeResult {
  const alternatives: string[] = Array.isArray(expectedAnswer)
    ? expectedAnswer.flatMap((a) => splitAlternatives(a))
    : splitAlternatives(expectedAnswer);

  if (alternatives.length === 0) {
    return {
      isCorrect: false,
      category: 'wrong',
      matchType: 'incorrect',
      score: 0,
      similarity: 0,
      distance: normalizeAnswer(studentInput).length,
      suggestedRating: 'again',
      message: 'No answer provided.',
    };
  }

  if (alternatives.length === 1) {
    return gradeSingleAlternative(studentInput, alternatives[0], options);
  }

  // Grade against each alternative individually
  const results = alternatives.map((alt) =>
    gradeSingleAlternative(studentInput, alt, options)
  );

  // Best result wins: exact > close > wrong, then higher score, then lower distance
  results.sort((a, b) => {
    const catScore = (cat: ClozeMatchCategory) =>
      cat === 'exact' ? 3 : cat === 'close' ? 2 : 1;
    const catDiff = catScore(b.category) - catScore(a.category);
    if (catDiff !== 0) return catDiff;

    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;

    const distDiff = a.distance - b.distance;
    if (distDiff !== 0) return distDiff;

    return b.similarity - a.similarity;
  });

  return results[0];
}
