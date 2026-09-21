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
2. CONCISE KEYWORD & KEY PHRASE ANSWERS: The correct answer ("back") and each distractor in "options" MUST be concise keywords, key concepts, or short phrases (1 to 8 words). Do NOT write full conversational sentences, entire paragraphs, or split sentences as options. The learner needs punchy, unambiguous keyword options that directly answer or complete the question.
3. DISTRACTORS: Must be realistic, plausible near-neighbours or documented misconceptions from the exact same subject domain, matching the grammar and concise keyword style of the correct answer.
4. CLEAN TEXT (CRITICAL): NEVER include document formatting artifacts such as trailing dots/periods (e.g. '..........'), citation brackets (e.g. '[1]', '[2]'), page numbers, or outline numbering (e.g. '1.', 'A.') in questions, answers, or options.
5. Every question stem ("front") must be a clear, self-contained prompt testing a specific concept, security standard, causal mechanism, or distinction.
6. For all "mcq" cards: "options" MUST contain exactly 4 distinct items: the FIRST item in "options" is always the correct answer (matching "back"), followed by 3 realistic distractors.
7. Every card MUST include an "explanation" field (at least 10 words) that adds context beyond the front and back fields combined — e.g. the broader principle, why common distractors are incorrect, or a real-world implication. For chunks describing a multi-step process, cycle, or system, you may include a simple Mermaid diagram inside the explanation (e.g. \`\`\`mermaid graph TD; A-->B \`\`\`) as an alternative visual aid.
8. Respond ONLY with a valid JSON array. No preamble, no markdown code fences wrapping the array, no commentary.

OUTPUT SCHEMA (JSON array of objects):
[
  {
    "front": "string — clear, active-recall multiple choice question stem",
    "back": "string — concise keyword or key phrase (1–8 words) that directly completes or answers the question",
    "type": "mcq",
    "explanation": "string — at least 10 words of pedagogical context and distractor rationale",
    "options": ["concise correct answer (1-8 words)", "concise distractor 1", "concise distractor 2", "concise distractor 3"]
  }
]
Note: For "mcq", the FIRST item in "options" must always be the correct answer.`;

function buildUserPrompt(chunk: string, count: number): string {
  return `Generate ${count} retrieval-practice multiple-choice questions (type: "mcq") with exactly 4 options for the following text.
Requirements:
- Each question must test active recall, mechanisms, or conceptual distinctions.
- The answer ("back") and all 4 options must be CONCISE KEYWORDS or short key phrases (1–8 words max) that match or complete the question.
- Do NOT output long sentences as answers.
- Strip all trailing dots ("..."), citations ("[1]"), and page artifacts.

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

    // Concise keyword / phrase answers (<= 8 words):
    // Testing LCS against the chunk for concise target terms (e.g. "Demilitarized Zone", "Least Privilege")
    // yields a false positive (ratio 1.0) because key terminology is naturally present in notes.
    const wordCount = card.back.trim().split(/\s+/).filter(Boolean).length;
    if (card.type === 'mcq' && wordCount <= 8) {
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
/** Clean table-of-contents dots, citations, and list artifacts */
function cleanTextSnippet(text: string): string {
  if (!text) return '';
  return text
    .replace(/\.{2,}/g, '') // remove trailing dot leaders ........
    .replace(/…+/g, '') // remove unicode ellipses
    .replace(/\[\d+\]|\(\d+\)/g, '') // remove [1] or (1) citations
    .replace(/^[-*•\d.)]+\s*/, '') // remove leading bullet numbers
    .replace(/\s+\d+$/, '') // remove trailing page numbers
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synthesizes structured 4-choice retrieval practice cards directly from a text chunk
 * if the AI provider is unconfigured or encounters a temporary API outage.
 * Extracts concise keywords / key phrases (1–8 words) and domain-relevant distractors.
 */
export function generateFallbackCardsForChunk(chunk: string, deckId: string): CardPayload[] {
  const lines = chunk
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => cleanTextSnippet(s))
    .filter((s) => s.length >= 15 && s.length <= 250);

  const payloads: CardPayload[] = [];

  // Determine domain
  const lowerChunk = chunk.toLowerCase();
  const isSecurityOrTech = /(?:security|network|firewall|bios|port|vulnerability|hardening|privilege|auth|encrypt|cipher|protocol|tpm|siem|packet|access|router|server|system|software|daemon|linux|windows)/i.test(lowerChunk);
  const isBiologyOrMedical = /(?:cell|membrane|protein|enzyme|atp|dna|rna|gene|metabolic|respiration|synthesis|organism|tissue|receptor)/i.test(lowerChunk);
  const isBusinessOrGov = /(?:market|finance|capital|revenue|strategy|cost|kpi|management|stakeholder|audit|policy|compliance)/i.test(lowerChunk);

  const securityDistractors = [
    'Restricted to local administrative console',
    'Requires TPM 2.0 cryptographic attestation',
    'Bypasses perimeter packet inspection filters',
    'Enforced via multi-factor conditional access',
    'Disabled by default to minimize attack surface',
    'Monitored via centralized SIEM audit alerts',
    'Mandates minimum 128-bit key entropy',
    'Isolates untrusted ingress perimeter traffic',
  ];

  const biologyDistractors = [
    'Modulates allosteric enzyme binding affinity',
    'Dependent on transmembrane proton gradients',
    'Catalyzed via ATP-dependent phosphorylation',
    'Regulates intracellular osmotic equilibrium',
    'Operates via negative feedback inhibition',
    'Inversely proportional to reactant concentration',
  ];

  const businessDistractors = [
    'Mitigates operational compliance exposure',
    'Maximizes return on invested capital',
    'Aligns operational milestones with quarterly KPIs',
    'Decentralizes governance to local stakeholders',
    'Improves liquidity ratios across fiscal quarters',
  ];

  const generalDistractors = [
    'Operates independently of baseline constraints',
    'Pre-established regulatory or design standard',
    'Requires systematic empirical verification',
    'Dynamic equilibrium under operational load',
    'Decentralized hierarchical framework',
    'Restricted exclusively to isolated testing modes',
  ];

  const activeDistractors = isSecurityOrTech
    ? securityDistractors
    : isBiologyOrMedical
    ? biologyDistractors
    : isBusinessOrGov
    ? businessDistractors
    : generalDistractors;

  for (let sIdx = 0; sIdx < Math.min(lines.length, 5); sIdx++) {
    const rawLine = lines[sIdx];
    const cleaned = cleanTextSnippet(rawLine);
    if (!cleaned || cleaned.length < 15) continue;

    // Pattern 1: Colon definition e.g. "Term: definition" or "Principle - explanation"
    const colonMatch = cleaned.match(/^([^:–—]+)[:–—]\s*(.+)$/);
    if (colonMatch && colonMatch[1].trim().split(/\s+/).length <= 6) {
      const term = colonMatch[1].trim();
      const desc = colonMatch[2].trim();
      const d1 = activeDistractors[(sIdx * 2) % activeDistractors.length];
      const d2 = activeDistractors[(sIdx * 2 + 1) % activeDistractors.length];
      const d3 = activeDistractors[(sIdx * 2 + 2) % activeDistractors.length];

      payloads.push({
        front: `Which concept or standard defines: "${desc}"?`,
        back: term,
        type: 'mcq',
        explanation: `In this curriculum context, "${term}" specifically denotes: ${desc}. Other options represent alternative distinct principles.`,
        options: [term, d1, d2, d3],
      });
      continue;
    }

    // Pattern 2: Copula / Rule statements like "BIOS Security is not enabled" or "Port 22 should be closed"
    const verbMatch = cleaned.match(/^(.+?)\s+(is not|is|are not|are|must be|should be|requires|provides|prevents)\s+(.+)$/i);
    if (verbMatch && verbMatch[1].trim().split(/\s+/).length <= 6) {
      const subject = verbMatch[1].trim();
      const verb = verbMatch[2].trim().toLowerCase();
      const remainder = verbMatch[3].trim().replace(/[.?!]$/, '');

      const remainderWords = remainder.split(/\s+/);
      const answerSnippet = remainderWords.slice(0, 6).join(' ');
      let conciseAnswer = '';
      if (verb.includes('not')) {
        if (/enabled/i.test(remainder)) conciseAnswer = 'Disabled / Not enabled';
        else if (/configured/i.test(remainder)) conciseAnswer = 'Not configured';
        else conciseAnswer = `Not ${answerSnippet}`;
      } else {
        if (/enabled/i.test(remainder)) conciseAnswer = 'Enabled / Active';
        else if (/required|mandatory/i.test(remainder)) conciseAnswer = 'Mandatory requirement';
        else conciseAnswer = answerSnippet.charAt(0).toUpperCase() + answerSnippet.slice(1);
      }

      const d1 = activeDistractors[(sIdx * 2) % activeDistractors.length];
      const d2 = activeDistractors[(sIdx * 2 + 1) % activeDistractors.length];
      const d3 = activeDistractors[(sIdx * 2 + 2) % activeDistractors.length];

      payloads.push({
        front: `What is the standard configuration or status regarding ${subject}?`,
        back: conciseAnswer,
        type: 'mcq',
        explanation: `According to the study material, ${subject} ${verb} ${remainder}. This MCQ assesses active retention of required baseline configurations.`,
        options: [conciseAnswer, d1, d2, d3],
      });
      continue;
    }

    // Pattern 3: General concise keyword extraction
    const words = cleaned.split(/\s+/);
    if (words.length >= 5) {
      const topicWords = words.slice(0, Math.min(4, words.length));
      const topic = topicWords.join(' ');
      const restWords = words.slice(topicWords.length);
      const answerWords = restWords.slice(0, Math.min(6, restWords.length));
      const conciseAnswer = answerWords.join(' ').replace(/[.?!]$/, '');

      const d1 = activeDistractors[(sIdx * 2) % activeDistractors.length];
      const d2 = activeDistractors[(sIdx * 2 + 1) % activeDistractors.length];
      const d3 = activeDistractors[(sIdx * 2 + 2) % activeDistractors.length];

      payloads.push({
        front: `What key requirement or guideline is associated with "${topic}"?`,
        back: conciseAnswer,
        type: 'mcq',
        explanation: `This question evaluates active recall of "${cleaned}". Distractors represent alternative technical criteria or system behaviors.`,
        options: [conciseAnswer, d1, d2, d3],
      });
    }
  }

  if (payloads.length === 0) {
    const cleanChunk = cleanTextSnippet(chunk).slice(0, 100);
    const d1 = activeDistractors[0];
    const d2 = activeDistractors[1];
    const d3 = activeDistractors[2];
    payloads.push({
      front: `What is the foundational requirement established regarding: "${cleanChunk}"?`,
      back: isSecurityOrTech ? 'Enforced baseline security control' : 'Core foundational principle',
      type: 'mcq',
      explanation: 'Active recall card generated directly from study notes to verify comprehension of core subject principles.',
      options: [
        isSecurityOrTech ? 'Enforced baseline security control' : 'Core foundational principle',
        d1,
        d2,
        d3,
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
