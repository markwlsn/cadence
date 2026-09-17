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
import { anthropic, GENERATION_MODEL } from './client';
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

Your task: given a text chunk, produce flashcards that force ACTIVE RECALL of relationships, mechanisms, causes, and applications — not passive recognition of definitions.

RULES (non-negotiable):
1. NEVER produce a card whose "back" can be found by scanning the source text for 2–3 seconds. Every answer must require synthesis, inference, or recall of a mechanism or relationship.
2. BAD question: "What is the mitochondria?" → answer is a copy-pasted definition.
   GOOD question: "Why does blocking the electron transport chain halt ATP synthesis?" → requires understanding a causal mechanism.
3. MIX card types: use "basic" for causal/mechanism questions, "cloze" for key terminology in context (fill-in-the-blank), "mcq" for conceptual distinctions. Aim for variety across all three types.
4. For "mcq" cards: distractors MUST each reflect a real, documented misconception or a plausible near-neighbour concept. Never use obviously wrong or random text.
5. Every card MUST include an "explanation" field (at least 10 words) that adds context beyond the front and back fields combined — e.g. the broader principle, a real-world implication, or why common misconceptions are wrong. For chunks describing a multi-step process, cycle, or system, you may include a simple Mermaid diagram inside the explanation (e.g. \`\`\`mermaid graph TD; A-->B \`\`\`) as an alternative visual aid.
6. For "cloze" type: the "front" field should be a complete sentence with exactly one key term replaced by {{blank}}. The "back" field is the missing term only.
7. Respond ONLY with a valid JSON array. No preamble, no markdown code fences wrapping the array, no commentary.

OUTPUT SCHEMA (JSON array of objects):
[
  {
    "front": "string — question stem, or cloze sentence with {{blank}}",
    "back": "string — concise answer, at most 30 words",
    "type": "basic" | "cloze" | "mcq",
    "explanation": "string — at least 10 words of additional context",
    "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"]
  }
]
Note: "options" is required only for "mcq" type. For "mcq", the FIRST item in "options" is always the correct answer.`;

function buildUserPrompt(chunk: string, count: number): string {
  return `Generate ${count} retrieval-practice flashcards for the following text.
Include at least one "cloze" card and one "mcq" card if the content supports them.
Vary the card types across the full set.

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

function stripFences(raw: string): string {
  // Remove optional ```json ... ``` or ``` ... ``` wrappers
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
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
    if (!['basic', 'cloze', 'mcq'].includes(raw.type as string)) {
      cardIssues.push(`invalid "type": ${JSON.stringify(raw.type)} (must be "basic", "cloze", or "mcq")`);
    }
    if (
      typeof raw.explanation !== 'string' ||
      raw.explanation.trim().split(/\s+/).filter(Boolean).length < 10
    ) {
      cardIssues.push('"explanation" must be a string of at least 10 words');
    }
    if (raw.type === 'mcq') {
      if (!Array.isArray(raw.options) || raw.options.length < 3) {
        cardIssues.push('"options" must be an array of at least 3 items for mcq cards');
      }
    }

    if (cardIssues.length > 0) {
      issues.push(`Card ${i + 1}: ${cardIssues.join('; ')}.`);
    } else {
      valid.push({
        front: (raw.front as string).trim(),
        back: (raw.back as string).trim(),
        type: raw.type as CardType,
        explanation: (raw.explanation as string).trim(),
        options: Array.isArray(raw.options)
          ? (raw.options as unknown[]).map(String)
          : undefined,
      });
    }
  }

  return { valid, issues };
}

// ---------------------------------------------------------------------------
// Quality gate application (R-01)
// ---------------------------------------------------------------------------

interface GateResult {
  passed: CardPayload[];
  failed: { card: CardPayload; lcsRatio: number }[];
}

function applyQualityGate(cards: CardPayload[], sourceChunk: string): GateResult {
  const passed: CardPayload[] = [];
  const failed: { card: CardPayload; lcsRatio: number }[] = [];

  for (const card of cards) {
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

    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    lastResponse = rawText;

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(rawText));
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
// Main export (R-10)
// ---------------------------------------------------------------------------

/**
 * Generate retrieval-practice flashcards from pre-chunked text.
 *
 * @param chunks - Array of concept-sized text chunks from parseContent().
 * @param deckId - The deck these cards belong to (written into each Card).
 * @returns      - Array of validated Card objects ready for DB persistence.
 *
 * @throws CardGenerationError if a chunk produces no valid cards after retries.
 */
export async function generateCards(
  chunks: string[],
  deckId: string
): Promise<Card[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      '[generate-cards] ANTHROPIC_API_KEY is not configured. ' +
      'Please configure it in .env.local to generate real flashcards.'
    );
  }

  const allCards: Card[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[generate-cards] Processing chunk ${i + 1}/${chunks.length} (${chunk.split(/\s+/).filter(Boolean).length} words)...`);

    try {
      const payloads = await generateCardsForChunk(chunk);
      const cards = payloads.map((p) => hydrateCard(p, deckId));
      allCards.push(...cards);
      console.log(`[generate-cards] Chunk ${i + 1}: generated ${cards.length} card(s).`);
    } catch (err) {
      if (err instanceof CardGenerationError) {
        // Re-throw — the caller decides whether to abort or continue
        throw err;
      }
      throw err;
    }
  }

  return allCards;
}
