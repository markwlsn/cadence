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

export const DOMAIN_DISTRACTOR_FALLBACKS = [
  'Disabled by default to minimize attack surface',
  'Requires TPM 2.0 cryptographic attestation',
  'Restricted to local administrative console',
  'Bypasses perimeter packet inspection filters',
  'Enforced via multi-factor conditional access',
  'Requires systematic empirical verification',
  'Pre-established regulatory or design standard',
  'Isolates untrusted ingress perimeter traffic',
];

/** Clean up raw table-of-contents dots, citations, numbers, and filler leaders from option displays */
export function cleanOptionDisplay(text: string, fallbackIdx = 0): string {
  if (!text) {
    return DOMAIN_DISTRACTOR_FALLBACKS[Math.abs(fallbackIdx) % DOMAIN_DISTRACTOR_FALLBACKS.length];
  }
  const cleaned = text
    .replace(/(?:\.\s*){2,}|\.{2,}|…+|[·•]{2,}|[-_=~]{3,}/g, '') // strip dotted leaders, spaced dots, filler dashes
    .replace(/\[\d+\]|\(\d+\)/g, '') // strip [1] or (1) citations
    .replace(/^(?:(?:\(|\[)?[a-zA-Z0-9]{1,2}[\.\)\:\-\]]\s*|[-*•\d.)]+\s*)/, '') // strip leading bullet/letter e.g. "A.", "1.", "(A)", "B)"
    .replace(/\s+\d+$/, '') // strip trailing page numbers
    .replace(/\s+/g, ' ')
    .trim();

  // If the option consisted entirely of dots/punctuation with no alphanumeric content, replace with valid distractor
  if (!cleaned || !/[a-zA-Z0-9]/.test(cleaned)) {
    return DOMAIN_DISTRACTOR_FALLBACKS[Math.abs(fallbackIdx) % DOMAIN_DISTRACTOR_FALLBACKS.length];
  }

  return cleaned;
}

/** Clean up raw table-of-contents dots and citations from question stems */
export function cleanQuestionDisplay(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:\.\s*){2,}|\.{2,}|…+|[·•]{2,}|[-_=~]{3,}/g, '')
    .replace(/\[\d+\]|\(\d+\)/g, '')
    .replace(/(["'])\s*(?:\d+[\.\)]|[a-zA-Z][\.\)])\s*/g, '$1')
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes an answer string for strict and flexible semantic comparison.
 */
export function normalizeForComparison(text: string): string {
  if (!text) return '';
  return text
    // 1. Strip leading option identifiers like "A.", "A)", "(A)", "1.", "1)", "Option A:"
    .replace(/^(?:\(?\s*[a-zA-Z0-9]{1,2}\s*[\.\)\:\-\]]\s*|option\s+[a-zA-Z0-9]\s*[\.\:\-]\s*)/i, '')
    // 2. Strip dotted leaders (e.g. ".......", ".... . . .")
    .replace(/(?:\.\s*){2,}|\.{2,}|…+|[·•]{2,}|[-_=~]{3,}/g, ' ')
    // 3. Strip citations like [1], (1)
    .replace(/\[\d+\]|\(\d+\)/g, '')
    // 4. Strip trailing page numbers e.g. "  42"
    .replace(/\s+\d+$/, '')
    // 5. Strip surrounding quotes and punctuation
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.,;:!?]+$/, '')
    // 6. Lowercase & collapse all whitespace
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a candidate student choice or text answer matches the expected answer.
 * Handles exact matches, stripped letter labels, trailing punctuation, and substring containment.
 */
export function isAnswerMatch(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;

  const normCandidate = normalizeForComparison(candidate);
  const normExpected = normalizeForComparison(expected);

  if (!normCandidate || !normExpected) return false;

  // Exact normalized match
  if (normCandidate === normExpected) return true;

  // Substring match if sufficiently distinctive (>= 4 characters)
  if (normCandidate.length >= 4 && normExpected.length >= 4) {
    if (normCandidate.includes(normExpected) || normExpected.includes(normCandidate)) {
      return true;
    }
  }

  // Article-stripped match (e.g. "the mitochondria" vs "mitochondria")
  const stripArticles = (s: string) => s.replace(/^(?:the|a|an)\s+/i, '').trim();
  if (stripArticles(normCandidate) === stripArticles(normExpected)) {
    return true;
  }

  return false;
}

/**
 * Normalizes any card into a strict 4-choice Multiple Choice Question (MCQ).
 * Pulls plausible distractors from the deck to ensure 100% MCQ standardization.
 */
export function ensureMultipleChoice(card: Card, allCards: Card[] = [], seed = 0): Card {
  const cleanFront = cleanQuestionDisplay(card.front || '');
  const correct = cleanOptionDisplay(card.back || '', 0).trim();

  // If already MCQ with 4 options and back matches one of them, clean and return it
  if (
    card.type === 'mcq' &&
    Array.isArray(card.options) &&
    card.options.length >= 4
  ) {
    const cleanedOpts = card.options
      .map((opt, i) => cleanOptionDisplay(opt, i))
      .filter((opt) => opt && opt.toLowerCase() !== correct.toLowerCase());

    const uniqueCleaned = Array.from(new Set(cleanedOpts));

    if (uniqueCleaned.length >= 3) {
      const targetSlot = Math.abs(seed) % 4;
      const shuffled: string[] = [];
      let distractorIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlot) {
          shuffled.push(correct);
        } else {
          shuffled.push(uniqueCleaned[distractorIdx] || DOMAIN_DISTRACTOR_FALLBACKS[i]);
          distractorIdx++;
        }
      }
      return {
        ...card,
        front: cleanFront,
        back: correct,
        type: 'mcq',
        options: shuffled,
      };
    }
  }

  // Gather candidate distractors from card options and other cards in the deck
  const candidatePool: string[] = [];
  if (card.options && Array.isArray(card.options)) {
    for (const opt of card.options) {
      const c = cleanOptionDisplay(opt);
      if (c && c.toLowerCase() !== correct.toLowerCase()) {
        candidatePool.push(c);
      }
    }
  }

  for (const other of allCards) {
    if (other.id !== card.id) {
      const otherBack = cleanOptionDisplay(other.back || '');
      if (otherBack && otherBack.toLowerCase() !== correct.toLowerCase()) {
        candidatePool.push(otherBack);
      }
      if (Array.isArray(other.options)) {
        for (const opt of other.options) {
          const c = cleanOptionDisplay(opt);
          if (c && c.toLowerCase() !== correct.toLowerCase()) {
            candidatePool.push(c);
          }
        }
      }
    }
  }

  // Deduplicate candidates
  const uniqueCandidates = Array.from(new Set(candidatePool));

  // Domain detection for appropriate fallback distractors
  const context = `${card.front || ''} ${card.back || ''} ${card.explanation || ''}`.toLowerCase();
  const isSecurity = /(?:security|network|firewall|bios|port|vulnerability|hardening|privilege|auth|encrypt|cipher|protocol|tpm|siem|packet|access|router|server)/i.test(context);
  const isBiology = /(?:cell|membrane|protein|enzyme|atp|dna|rna|gene|metabolic|respiration|synthesis|organism|tissue)/i.test(context);
  const isBusiness = /(?:market|finance|capital|revenue|strategy|cost|kpi|management|stakeholder|audit|policy)/i.test(context);

  const domainFallbacks = isSecurity
    ? [
        'Restricted to local administrative console',
        'Requires TPM 2.0 cryptographic attestation',
        'Bypasses perimeter packet inspection filters',
        'Enforced via multi-factor conditional access',
        'Disabled by default to minimize attack surface',
        'Monitored via centralized SIEM audit alerts',
      ]
    : isBiology
    ? [
        'Modulates allosteric enzyme binding affinity',
        'Dependent on transmembrane proton gradients',
        'Catalyzed via ATP-dependent phosphorylation',
        'Regulates intracellular osmotic equilibrium',
        'Operates via negative feedback inhibition',
        'Inversely proportional to reactant concentration',
      ]
    : isBusiness
    ? [
        'Mitigates operational compliance exposure',
        'Maximizes return on invested capital',
        'Aligns operational milestones with quarterly KPIs',
        'Decentralizes governance to local stakeholders',
        'Improves liquidity ratios across fiscal quarters',
      ]
    : [
        'Operates independently of baseline system constraints',
        'Pre-established regulatory or design standard',
        'Requires systematic empirical verification',
        'Dynamic equilibrium under operational load',
        'Decentralized hierarchical framework',
        'Restricted exclusively to isolated testing configurations',
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

  // If still need distractors, fill with domain-appropriate fallbacks
  let fallbackIdx = positiveHash % domainFallbacks.length;
  while (distractors.length < 3) {
    const fb = domainFallbacks[fallbackIdx % domainFallbacks.length];
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
    front: cleanFront,
    back: correct,
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
      estimatedMinutes: 2,
    },
    {
      ...ASSESSMENT_CONFIGS[1],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 2,
    },
    {
      ...ASSESSMENT_CONFIGS[2],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 2,
    },
    {
      ...ASSESSMENT_CONFIGS[3],
      targetCount: Math.min(5, Math.max(1, Math.ceil(safeTotal * 0.15))),
      estimatedMinutes: 2,
    },
    {
      ...ASSESSMENT_CONFIGS[4],
      targetCount: Math.min(12, Math.max(2, Math.ceil(safeTotal * 0.4))),
      estimatedMinutes: 30,
    },
    {
      ...ASSESSMENT_CONFIGS[5],
      targetCount: Math.min(15, Math.max(2, Math.ceil(safeTotal * 0.5))),
      estimatedMinutes: 30,
    },
    {
      ...ASSESSMENT_CONFIGS[6],
      title: safeTotal >= 35 ? 'Comprehensive Exam (35 items)' : `Comprehensive Exam (${safeTotal} items)`,
      targetCount: Math.min(35, safeTotal),
      estimatedMinutes: 60,
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
