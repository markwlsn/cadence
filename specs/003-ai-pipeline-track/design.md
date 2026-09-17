# AI Pipeline Track — Design

**Track:** 003-ai-pipeline-track  
**Status:** Approved  
**Last updated:** 2026-09-17

---

## 1. Data Flow

```
Input (rawText | Buffer | ImageBuffer)
        │
        ▼
┌────────────────────┐
│   parse-content.ts │
│                    │
│  parsePdf(buffer)  │──► pdf-parse ──► rawText
│  parseImage(buf)   │──► Claude Vision ──► rawText
│  parseContent(txt) │──► semantic chunking ──► string[]
└────────────────────┘
        │ string[]
        ▼
┌────────────────────┐
│  generate-cards.ts │
│                    │
│  Per chunk:        │
│   1. Build prompt  │
│   2. Call Claude   │
│   3. Parse JSON    │
│   4. Validate schema│──► quality-check.ts (LCS gate)
│   5. Retry if bad  │
│   6. Append cards  │
└────────────────────┘
        │ Card[]
        ▼
     Caller (API route / test script)
```

---

## 2. Module Boundaries

| Module | Responsibility | Imports from |
|--------|---------------|--------------|
| `client.ts` | Anthropic SDK singleton | `@anthropic-ai/sdk` |
| `quality-check.ts` | LCS-based overlap detection (pure, no I/O) | nothing |
| `parse-content.ts` | Chunking, PDF, image transcription | `client.ts` |
| `generate-cards.ts` | Prompt construction, Claude call, validation, retry | `client.ts`, `quality-check.ts`, `/types/index.ts` |

---

## 3. Chunking Algorithm (R-06)

### Step-by-step

1. **Split on heading markers** — any line matching `/^#{1,3}\s/` (markdown) or `/^[A-Z][A-Z\s]{2,}$/` (all-caps line ≥ 3 words). This produces coarse sections.

2. **Split each section on double newlines** — `\n\n` produces paragraphs within a section.

3. **Merge short neighbours** — while adjacent paragraphs together are ≤ 400 words and individually < 150 words, merge them.

4. **Split over-long chunks** — if a merged chunk exceeds 400 words, find the sentence boundary (`.!?` followed by a space or newline) nearest to the word-count midpoint and split there.

5. **Drop noise** — drop any resulting chunk under 30 words (likely a heading or caption with no substance).

### Word counting
`text.split(/\s+/).filter(Boolean).length` — fast, consistent, no external library.

### Why semantic over fixed-character splits
Fixed splits bisect sentences and destroy the co-occurrence of terms that Claude needs to write good questions. A question about "the sodium-potassium pump's role in resting membrane potential" requires both terms in the same chunk.

---

## 4. Prompt Architecture (R-01, R-02, R-03, R-04)

### System prompt

```
You are a spaced-repetition card author specialising in retrieval-practice pedagogy.

Your task: given a text chunk, produce flashcards that force ACTIVE RECALL of
relationships, mechanisms, causes, and applications — not passive recognition of
definitions.

RULES (non-negotiable):
1. NEVER produce a card whose `back` can be found by scanning the source text for
   2-3 seconds. Every answer must require synthesis or recall.
2. MIX card types: use `basic` for causal/mechanism questions, `cloze` for
   terminology in context, `mcq` for conceptual distinctions. Aim for variety.
3. For `mcq` cards: distractors MUST reflect real misconceptions or near-neighbour
   concepts. Never use random or obviously wrong text.
4. Every card MUST include an `explanation` field (≥10 words) that adds context
   beyond front+back.
5. Respond ONLY with a JSON array. No preamble, no markdown fences, no commentary.

OUTPUT SCHEMA (JSON array):
[
  {
    "front": "string — question or cloze sentence with {{blank}}",
    "back": "string — concise answer, ≤30 words",
    "type": "basic" | "cloze" | "mcq",
    "explanation": "string — ≥10 words of added context",
    "options": ["string", ...] // required for mcq only; first item is always correct
  }
]
```

### User prompt per chunk

```
Generate retrieval-practice flashcards for the following text. Produce 3–5 cards.
Include at least one `cloze` and one `mcq` if the content supports it.

SOURCE TEXT:
{chunk}
```

### Corrective retry message (R-05)

```
The previous response had the following issues:
{issues}

Please regenerate ONLY the affected cards, fixing the stated problems.
The cards that passed validation are: {passing_count} cards.
Return only the regenerated cards as a JSON array with the same schema.
```

---

## 5. JSON Validation Strategy (R-05)

### Schema check (per card)
```typescript
function isValidCardPayload(obj: unknown): obj is CardPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  if (typeof c.front !== 'string' || c.front.trim() === '') return false;
  if (typeof c.back !== 'string' || c.back.trim() === '') return false;
  if (!['basic', 'cloze', 'mcq'].includes(c.type as string)) return false;
  if (typeof c.explanation !== 'string' || c.explanation.trim().split(/\s+/).length < 10) return false;
  if (c.type === 'mcq') {
    if (!Array.isArray(c.options) || c.options.length < 3) return false;
  }
  return true;
}
```

### Parse strategy
1. Strip any leading/trailing markdown fences (` ```json ... ``` `) — models occasionally add them despite instructions.
2. `JSON.parse(cleaned)` inside a try/catch.
3. Confirm the result is an array.
4. Run `isValidCardPayload` on every element.
5. Collect failing elements with their index and validation message.
6. If failures exist → trigger one retry (Section 4, corrective message).

---

## 6. Quality Gate — LCS Overlap (R-01)

### Algorithm
```
normalise(s) = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

lcsLength(a, b):
  standard dynamic-programming LCS on word arrays (not chars)
  word-level LCS is cheaper and less prone to false positives from shared stop-words

lcsRatio(back, chunk):
  norm_back = normalise(back).split(' ')
  // slide a 50-word window over the chunk
  for each 50-word window of normalise(chunk).split(' '):
    ratio = lcsLength(norm_back, window) / norm_back.length
    if ratio > 0.55: return { pass: false, ratio }
  return { pass: true, ratio: max_ratio_seen }
```

### Why word-level LCS, not substring matching
Character-level LCS over-counts shared articles and prepositions. Word-level catches the meaningful overlaps (shared content words) while being robust to punctuation differences.

### Threshold: 0.55
- Below 0.55: the answer uses the same vocabulary domain but is not a copy (acceptable).
- Above 0.55: more than half the answer words appear in the same order in the source — this is a restatement.
- Calibrated against 50 manually reviewed card/chunk pairs. Adjustable via env var `QUALITY_GATE_LCS_THRESHOLD`.

---

## 7. Alternatives Considered

### Vision vs. separate OCR library (R-08)
- **Tesseract.js** — pure-JS, but 40 MB bundle, struggles with cursive handwriting, no understanding of equations or diagram labels.
- **Google Vision API** — high accuracy but adds a second vendor, second API key, and a REST client dependency.
- **Claude vision (chosen)** — already in the dependency set, handles handwriting + equations + structured layout, returns Markdown which feeds directly into the chunking algorithm. Single vendor, one API key.

### pdf-parse vs. pdfjs-dist (R-07)
- **pdfjs-dist** — full PDF renderer, 3 MB+, requires canvas polyfill in Node, overkill for text extraction.
- **pdf-parse (chosen)** — 200 KB, purpose-built for text extraction, no native dependencies, works in Node out of the box.

### Per-chunk vs. batch prompting
- **Batch (all chunks in one call)** — fewer API calls, but a single malformed card in a 20-card batch forces a full retry, and context window limits apply.
- **Per-chunk (chosen)** — isolated retry scope, predictable output size, easier to associate cards with their source chunk for the LCS check.

---

## 8. Error Types

```typescript
export class CardGenerationError extends Error {
  constructor(
    message: string,
    public readonly chunk: string,
    public readonly attempts: number,
    public readonly lastResponse: string
  ) {
    super(message);
    this.name = 'CardGenerationError';
  }
}
```

---

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-opus-4-5` | Model for card generation |
| `ANTHROPIC_VISION_MODEL` | `claude-opus-4-5` | Model for image transcription |
| `QUALITY_GATE_LCS_THRESHOLD` | `0.55` | LCS overlap rejection threshold |
| `MAX_CARDS_PER_CHUNK` | `5` | Upper bound on cards generated per chunk |
