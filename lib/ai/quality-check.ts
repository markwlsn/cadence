/**
 * /lib/ai/quality-check.ts
 *
 * Pure quality-gate functions for the retrieval-practice bar (R-01).
 * No I/O, no external dependencies — fully unit-testable in isolation.
 *
 * Gate: reject any card whose `back` shares > QUALITY_GATE_THRESHOLD
 * word-level LCS ratio with any 50-word window of the source chunk.
 */

/** Rejection threshold. Overridable via QUALITY_GATE_LCS_THRESHOLD env var. */
export const QUALITY_GATE_THRESHOLD: number = (() => {
  const v = parseFloat(process.env.QUALITY_GATE_LCS_THRESHOLD ?? '');
  return Number.isFinite(v) && v > 0 && v < 1 ? v : 0.55;
})();

/** Window size (words) slid over the source chunk for comparison. */
const WINDOW_SIZE = 50;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a string for comparison:
 * lowercase, strip non-alphanumeric (keep spaces), collapse whitespace.
 */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-level longest common subsequence length (not substring — subsequence).
 * Operates on pre-split word arrays. Uses DP, O(m×n).
 *
 * We use word-level LCS (not character-level) because:
 * - Shared stop-words at character level generate false positives.
 * - Word-level catches meaningful content-word overlap.
 */
export function wordLcs(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Single-row DP to save memory
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[n];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface OverlapResult {
  pass: boolean;
  lcsRatio: number;   // highest ratio seen across all windows
  threshold: number;  // threshold used for this check
}

/**
 * Check whether a card's `back` field is a near-verbatim restatement
 * of any 50-word window in the source chunk.
 *
 * @param back        - The card's answer text.
 * @param sourceChunk - The source text chunk this card was generated from.
 * @returns           - { pass: true } if the card passes the quality bar.
 */
export function checkOverlap(back: string, sourceChunk: string): OverlapResult {
  const normBack = normalise(back).split(' ').filter(Boolean);
  const normChunk = normalise(sourceChunk).split(' ').filter(Boolean);

  if (normBack.length === 0) {
    // Empty back — fail immediately; schema validation will also catch this.
    return { pass: false, lcsRatio: 1, threshold: QUALITY_GATE_THRESHOLD };
  }

  let maxRatio = 0;

  // Slide WINDOW_SIZE-word windows over the chunk
  const end = Math.max(1, normChunk.length - WINDOW_SIZE + 1);
  for (let i = 0; i < end; i++) {
    const window = normChunk.slice(i, i + WINDOW_SIZE);
    const lcs = wordLcs(normBack, window);
    const ratio = lcs / normBack.length;
    if (ratio > maxRatio) maxRatio = ratio;
    // Early exit: already over threshold
    if (maxRatio > QUALITY_GATE_THRESHOLD) {
      return { pass: false, lcsRatio: maxRatio, threshold: QUALITY_GATE_THRESHOLD };
    }
  }

  return {
    pass: maxRatio <= QUALITY_GATE_THRESHOLD,
    lcsRatio: maxRatio,
    threshold: QUALITY_GATE_THRESHOLD,
  };
}
