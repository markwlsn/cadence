/**
 * Levenshtein distance and fuzzy string matching for student answer validation.
 * Enables forgiving, intelligent grading for typos while preserving retrieval rigor.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const aChar = a[i - 1];

    for (let j = 1; j <= n; j++) {
      const bChar = b[j - 1];
      const cost = aChar === bChar ? 0 : 1;

      currRow[j] = Math.min(
        currRow[j - 1] + 1,      // insertion
        prevRow[j] + 1,          // deletion
        prevRow[j - 1] + cost    // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n];
}

/**
 * Calculate similarity ratio between two strings (0.0 to 1.0).
 */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return (maxLen - dist) / maxLen;
}

export interface MatchResult {
  isMatch: boolean;
  matchType: 'exact' | 'typo' | 'incorrect';
  similarity: number;
  message?: string;
}

/**
 * Normalize text for fair comparison:
 * lowercase, remove quotes, strip trailing punctuation, collapse spaces.
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/[.,;:!?]+$/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Intelligent fuzzy evaluation for student cloze / fill-in-the-blank answers.
 */
export function evaluateStudentAnswer(studentInput: string, expectedAnswer: string): MatchResult {
  const normStudent = normalizeAnswer(studentInput);
  const normExpected = normalizeAnswer(expectedAnswer);

  if (!normStudent || !normExpected) {
    return { isMatch: false, matchType: 'incorrect', similarity: 0 };
  }

  // 1. Exact match
  if (normStudent === normExpected) {
    return { isMatch: true, matchType: 'exact', similarity: 1.0 };
  }

  // 2. Code spacing tolerance (e.g. `n % 2 == 0` vs `n%2==0` or `a + b` vs `a+b`)
  const codeStudent = normStudent.replace(/\s+/g, '');
  const codeExpected = normExpected.replace(/\s+/g, '');
  if (codeStudent === codeExpected) {
    return { isMatch: true, matchType: 'exact', similarity: 1.0 };
  }

  // 3. Typo tolerance using Levenshtein distance
  const distance = levenshteinDistance(normStudent, normExpected);
  const similarity = stringSimilarity(normStudent, normExpected);

  // Short words (<= 3 chars): require exact match to prevent false positives (e.g. "ATP" vs "ADP")
  if (normExpected.length <= 3) {
    return {
      isMatch: false,
      matchType: 'incorrect',
      similarity,
      message: 'Exact match required for short terms.',
    };
  }

  // Medium words (4-6 chars): allow max 1 typo if similarity >= 0.75
  if (normExpected.length <= 6 && distance <= 1 && similarity >= 0.75) {
    return {
      isMatch: true,
      matchType: 'typo',
      similarity,
      message: `Minor typo (${studentInput} → ${expectedAnswer})`,
    };
  }

  // Longer words (7+ chars): allow max 2 edit distance or similarity >= 0.82
  if (normExpected.length >= 7 && (distance <= 2 || similarity >= 0.82)) {
    return {
      isMatch: true,
      matchType: 'typo',
      similarity,
      message: `Close match (${studentInput} → ${expectedAnswer})`,
    };
  }

  return { isMatch: false, matchType: 'incorrect', similarity };
}
