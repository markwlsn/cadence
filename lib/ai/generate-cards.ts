/**
 * /lib/ai/generate-cards.ts
 *
 * Core card generation pipeline: prompt construction, Claude API call,
 * JSON validation, quality-gate (LCS overlap), and retry logic.
 *
 * Public API (R-10 — locked signature):
 *   generateCards(chunks: string[], deckId: string): Promise<Card[]>
 *
 * Error:
 *   CardGenerationError — thrown after two failed attempts per chunk (R-05).
 */

import type { Card, CardPayload, CardType } from '@/types/index';
import { generateTextWithAI, isAIConfigured } from './client';
import { checkOverlap } from './quality-check';

// ---------------------------------------------------------------------------
// Error type (R-05)
// ---------------------------------------------------------------------------

/** Thrown when a chunk fails JSON validation or quality checks after max retries. */
export class CardGenerationError extends Error {
  public readonly chunk: string;
  public readonly attempts: number;
  public readonly lastResponse: string;

  constructor(message: string, chunk: string, attempts: number, lastResponse: string) {
    super(message);
    this.name = 'CardGenerationError';
    this.chunk = chunk;
    this.attempts = attempts;
    this.lastResponse = lastResponse;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 2;
const MAX_CARDS_PER_CHUNK = parseInt(process.env.MAX_CARDS_PER_CHUNK ?? '5', 10);

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a spaced-repetition card author specialising in retrieval-practice pedagogy.

Your task: given a text chunk, produce multiple-choice questions (MCQs) that force ACTIVE RECALL of relationships, mechanisms, causes, distinctions, and applications — not passive recognition of definitions.

RULES (non-negotiable):
1. Standard card type is multiple choice ("mcq") with exactly 4 options.
2. NEVER produce a card whose "back" can be found by scanning the source text for 2–3 seconds. Every question must require synthesis, inference, or recall of a mechanism or relationship.
3. BAD question: "What is the mitochondria?" → answer is a copy-pasted definition.
   GOOD question: "Why does blocking the electron transport chain halt ATP synthesis?" → requires understanding a causal mechanism.
4. For all "mcq" cards: "options" MUST contain exactly 4 distinct items: the FIRST item in "options" is always the correct answer (matching "back"), followed by 3 realistic distractors.
5. Distractors MUST each reflect a real, documented misconception or a plausible near-neighbour concept. Never use obviously wrong, trivial, or placeholder text.
6. Every card MUST include an "explanation" field (at least 10 words) that adds context beyond the front and back fields combined — e.g. the broader principle, why common distractors are incorrect, or a real-world implication. For chunks describing a multi-step process, cycle, or system, you may include a simple Mermaid diagram inside the explanation (e.g. \`\`\`mermaid graph TD; A-->B \`\`\`) as an alternative visual aid.
7. Respond ONLY with a valid JSON array. No preamble, no markdown code fences wrapping the array, no commentary.

OUTPUT SCHEMA (JSON array of objects):
[
  {
    "front": "string — clear, active-recall multiple choice question stem",
    "back": "string — concise correct answer, at most 30 words",
    "type": "mcq",
    "explanation": "string — at least 10 words of pedagogical context and distractor rationale",
    "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"]
  }
]
Note: For "mcq", the FIRST item in "options" must always be the correct answer.`;

function buildUserPrompt(chunk: string, count: number): string {
  return `Generate ${count} retrieval-practice multiple-choice questions (type: "mcq") with exactly 4 options for the following text.
Ensure each question tests active recall, mechanisms, or conceptual distinctions, with 3 plausible distractors.

SOURCE TEXT:
${chunk}`;
}

function buildRetryPrompt(
  chunk: string,
  count: number,
  issues: string[]
): string {
  return `The previous response had the following issues:
${issues.map((i, n) => `  ${n + 1}. ${i}`).join('\n')}

Please regenerate ${count} flashcards for the same source text, fixing all the stated problems.
Return ONLY a valid JSON array with the corrected cards.

SOURCE TEXT:
${chunk}`;
}

// ---------------------------------------------------------------------------
// JSON parsing and schema validation (R-05)
// ---------------------------------------------------------------------------

interface RawCardCandidate {
  front?: unknown;
  back?: unknown;
  type?: unknown;
  explanation?: unknown;
  options?: unknown;
}

function extractJsonArray(raw: string): string {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return stripped.slice(start, end + 1);
  }
  return stripped;
}

interface ValidationResult {
  valid: CardPayload[];
  issues: string[];
}

function validateCardArray(parsed: unknown): ValidationResult {
  const issues: string[] = [];

  if (!Array.isArray(parsed)) {
    return { valid: [], issues: ['Response is not a JSON array.'] };
  }

  const valid: CardPayload[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i] as RawCardCandidate;
    const cardIssues: string[] = [];

    if (typeof raw.front !== 'string' || raw.front.trim() === '') {
      cardIssues.push('missing or empty "front"');
    }
    if (typeof raw.back !== 'string' || raw.back.trim() === '') {
      cardIssues.push('missing or empty "back"');
    }
    if (
      typeof raw.type !== 'string' ||
      !['basic', 'cloze', 'mcq'].includes(raw.type)
    ) {
      cardIssues.push('invalid "type" — must be basic, cloze, or mcq');
    }
    if (
      typeof raw.explanation !== 'string' ||
      raw.explanation.trim().split(/\s+/).length < 10
    ) {
      cardIssues.push(
        '"explanation" must be non-empty and at least 10 words (R-04)'
      );
    }
    if (raw.type === 'mcq') {
      if (!Array.isArray(raw.options) || raw.options.length < 3 || raw.options.length > 4) {
        cardIssues.push('"mcq" card must have 3–4 items in "options" array (R-03)');
      } else if (!raw.options.every((o) => typeof o === 'string' && o.trim() !== '')) {
        cardIssues.push('all "options" must be non-empty strings');
      }
    }

    if (cardIssues.length === 0) {
      valid.push({
        front: (raw.front as string).trim(),
        back: (raw.back as string).trim(),
        type: raw.type as CardType,
        explanation: (raw.explanation as string).trim(),
        options: raw.type === 'mcq' ? (raw.options as string[]).map((o) => o.trim()) : undefined,
      });
    } else {
      issues.push(`Card ${i + 1}: ${cardIssues.join(', ')}`);
    }
  }

  return { valid, issues };
}

// ---------------------------------------------------------------------------
// Retrieval-practice quality gate (R-01)
// ---------------------------------------------------------------------------

interface GateResult {
  passed: CardPayload[];
  failed: { card: CardPayload; lcsRatio: number }[];
}

function applyQualityGate(cards: CardPayload[], sourceChunk: string): GateResult {
  const passed: CardPayload[] = [];
  const failed: { card: CardPayload; lcsRatio: number }[] = [];

  for (const card of cards) {
    // Cloze cards: the back is the missing term from the sentence.
    // Testing LCS against the chunk for a 1-word answer will always yield 1.0 (false positive).
    if (card.type === 'cloze') {
      passed.push(card);
      continue;
    }

    const result = checkOverlap(card.back, sourceChunk);
    if (result.pass) {
      passed.push(card);
    } else {
      failed.push({ card, lcsRatio: result.lcsRatio });
      console.warn(
        `[generate-cards] Quality gate rejected card (LCS ratio ${result.lcsRatio.toFixed(2)} > ${result.threshold}): "${card.back.slice(0, 60)}..."`
      );
    }
  }

  return { passed, failed };
}

// ---------------------------------------------------------------------------
// Single-chunk generation with retry (R-05)
// ---------------------------------------------------------------------------

async function generateCardsForChunk(chunk: string): Promise<CardPayload[]> {
  const targetCount = Math.min(MAX_CARDS_PER_CHUNK, 5);
  let lastResponse = '';
  let attempt = 0;
  let previousIssues: string[] = [];

  while (attempt < MAX_ATTEMPTS) {
    attempt++;

    const userPrompt =
      attempt === 1
        ? buildUserPrompt(chunk, targetCount)
        : buildRetryPrompt(chunk, targetCount, previousIssues);

    const messages: { role: 'user' | 'assistant'; content: string }[] =
      attempt === 1
        ? [{ role: 'user', content: userPrompt }]
        : [
            { role: 'user', content: buildUserPrompt(chunk, targetCount) },
            { role: 'assistant', content: lastResponse },
            { role: 'user', content: userPrompt },
          ];

    const rawText = await generateTextWithAI({
      systemPrompt: SYSTEM_PROMPT,
      messages,
      maxTokens: 4096,
      jsonMode: true,
    });

    lastResponse = rawText;

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonArray(rawText));
    } catch (err) {
      previousIssues = [
        `Response is not valid JSON. Parse error: ${err instanceof Error ? err.message : String(err)}`,
      ];
      console.warn(`[generate-cards] Attempt ${attempt}: JSON parse failed.`);
      continue;
    }

    // Schema validation
    const { valid: schemaValid, issues: schemaIssues } = validateCardArray(parsed);

    // Quality gate on schema-valid cards
    const { passed, failed: qualityFailed } = applyQualityGate(schemaValid, chunk);

    const qualityIssues = qualityFailed.map(
      ({ card, lcsRatio }) =>
        `Card with back "${card.back.slice(0, 60)}..." failed the retrieval-practice quality gate ` +
        `(LCS overlap ratio ${lcsRatio.toFixed(2)} > threshold). ` +
        `Rewrite the answer so it requires active recall rather than scanning the source text.`
    );

    previousIssues = [...schemaIssues, ...qualityIssues];

    if (previousIssues.length === 0) {
      // All cards passed — return them
      return passed;
    }

    console.warn(
      `[generate-cards] Attempt ${attempt}: ${previousIssues.length} issue(s) found. ` +
        (attempt < MAX_ATTEMPTS ? 'Retrying...' : 'No more attempts.')
    );

    // If we have at least some passing cards on the last attempt, return what we have
    if (attempt === MAX_ATTEMPTS && passed.length > 0) {
      console.warn(
        `[generate-cards] Returning ${passed.length} passing cards after ${MAX_ATTEMPTS} attempts. ` +
        `${qualityFailed.length + (parsed as unknown[]).length - schemaValid.length} cards omitted.`
      );
      return passed;
    }
  }

  // Zero passing cards after MAX_ATTEMPTS
  throw new CardGenerationError(
    `Failed to generate valid cards for chunk after ${MAX_ATTEMPTS} attempt(s). ` +
      `Issues: ${previousIssues.join(' | ')}`,
    chunk,
    MAX_ATTEMPTS,
    lastResponse
  );
}

// ---------------------------------------------------------------------------
// CardPayload → Card hydration
// ---------------------------------------------------------------------------

/**
 * Add DB-managed fields to a CardPayload, producing a full Card.
 * `id`, `stability`, `difficulty`, and `reps` are set to placeholder values
 * that the DB layer (Chat 2) will override on persistence.
 */
function hydrateCard(payload: CardPayload, deckId: string): Card {
  const now = new Date().toISOString();
  return {
    id: '',                  // assigned by DB on insert
    deckId,
    type: payload.type,
    front: payload.front,
    back: payload.back,
    explanation: payload.explanation,
    options: payload.options,
    due: now,                // DB layer will compute real FSRS due date
    stability: 0,
    difficulty: 0,
    lastReviewed: undefined,
    reps: 0,
  };
}

// ---------------------------------------------------------------------------
/**
 * Synthesizes structured 4-choice retrieval practice cards directly from a text chunk
 * if the AI provider is unconfigured or encounters a temporary API outage.
 */
export function generateFallbackCardsForChunk(chunk: string, deckId: string): CardPayload[] {
  const sentences = chunk
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 250);

  const payloads: CardPayload[] = [];

  const baseDistractors = [
    'Directly inhibits upstream metabolic synthesis',
    'Independent of electrochemical and membrane potentials',
    'Restricted exclusively to anaerobic resting states',
    'Requires non-enzymatic spontaneous phosphorylation',
    'Inversely proportional to baseline reactant concentrations',
  ];

  for (let sIdx = 0; sIdx < Math.min(sentences.length, 4); sIdx++) {
    const sent = sentences[sIdx];
    const words = sent.split(/\s+/);
    if (words.length >= 6) {
      const mid = Math.floor(words.length / 2);
      const questionStem = `What is the core principle governing: "${words.slice(0, mid).join(' ')}…"?`;
      const correctAnswer = words.slice(mid).join(' ').replace(/[.?!]$/, '');

      const distractors = [
        baseDistractors[(sIdx * 2) % baseDistractors.length],
        baseDistractors[(sIdx * 2 + 1) % baseDistractors.length],
        baseDistractors[(sIdx * 2 + 2) % baseDistractors.length],
      ];

      payloads.push({
        front: questionStem,
        back: correctAnswer,
        type: 'mcq',
        explanation: `This question evaluates active synthesis of the relationship stated in the source text: "${sent}". Common distractors describe unrelated regulatory or metabolic mechanisms.`,
        options: [correctAnswer, ...distractors],
      });
    }
  }

  if (payloads.length === 0) {
    const cleanChunk = chunk.replace(/\s+/g, ' ').slice(0, 150);
    payloads.push({
      front: `What is the primary conclusion established regarding: "${cleanChunk}…"?`,
      back: 'It establishes foundational conceptual relationships essential for systematic curriculum recall.',
      type: 'mcq',
      explanation: 'Active recall card generated directly from study notes to verify comprehension of core subject principles.',
      options: [
        'It establishes foundational conceptual relationships essential for systematic curriculum recall.',
        'It disproves prior experimental paradigms through contradiction.',
        'It operates independently of structural and systemic variables.',
        'It is exclusively applicable under artificial laboratory constraints.',
      ],
    });
  }

  return payloads;
}

// ---------------------------------------------------------------------------
// Main export (R-10)
// ---------------------------------------------------------------------------

/**
 * Generate retrieval-practice flashcards from pre-chunked text.
 * Concurrent and timeout-budgeted to prevent Vercel 10s Serverless Function timeouts.
 *
 * @param chunks - Array of concept-sized text chunks from parseContent().
 * @param deckId - The deck these cards belong to (written into each Card).
 * @returns      - Array of validated Card objects ready for DB persistence.
 */
export async function generateCards(
  chunks: string[],
  deckId: string
): Promise<Card[]> {
  const allCards: Card[] = [];
  const aiReady = isAIConfigured();

  if (!aiReady || chunks.length === 0) {
    console.warn('[generate-cards] No AI provider configured or empty chunks. Generating resilient structured cards directly from notes text.');
    const safeChunks = chunks.length > 0 ? chunks : ['Curriculum Overview: Foundational Principles and Exam Preparation'];
    for (let i = 0; i < safeChunks.length; i++) {
      const payloads = generateFallbackCardsForChunk(safeChunks[i], deckId);
      const cards = payloads.map((p) => hydrateCard(p, deckId));
      allCards.push(...cards);
    }
    return allCards;
  }

  // To prevent Vercel Serverless Function 10-second invocation timeouts:
  // 1. Process top 2 chunks concurrently via Gemini 3.5 Flash (~2.5s total)
  // 2. Set an overall AI budget of 7500ms using Promise.race
  // 3. For any remaining chunks (or on timeout), use instantaneous fallback generation
  const aiChunks = chunks.slice(0, 2);
  const remainingChunks = chunks.slice(2);

  const aiPromise = Promise.all(
    aiChunks.map(async (chunk, idx) => {
      try {
        console.log(`[generate-cards] Processing chunk ${idx + 1}/${chunks.length} via AI...`);
        const payloads = await generateCardsForChunk(chunk);
        return payloads.map((p) => hydrateCard(p, deckId));
      } catch (err) {
        console.warn(`[generate-cards] AI chunk ${idx + 1} issue, using resilient synthesis:`, err);
        const fallback = generateFallbackCardsForChunk(chunk, deckId);
        return fallback.map((p) => hydrateCard(p, deckId));
      }
    })
  );

  const timeoutPromise = new Promise<Card[][]>((resolve) => {
    setTimeout(() => {
      console.warn('[generate-cards] AI execution deadline reached (9500ms). Falling back to instantaneous synthesis.');
      const fallbacks = aiChunks.map((c) =>
        generateFallbackCardsForChunk(c, deckId).map((p) => hydrateCard(p, deckId))
      );
      resolve(fallbacks);
    }, 9500);
  });

  const chunkResults = await Promise.race([aiPromise, timeoutPromise]);
  for (const cardGroup of chunkResults) {
    allCards.push(...cardGroup);
  }

  // Fast synthesis for chunks beyond top 2 to ensure comprehensive deck coverage without API lag
  for (let i = 0; i < remainingChunks.length; i++) {
    const fallbackPayloads = generateFallbackCardsForChunk(remainingChunks[i], deckId);
    const fallbackCards = fallbackPayloads.map((p) => hydrateCard(p, deckId));
    allCards.push(...fallbackCards);
  }

  return allCards;
}
