# AI Pipeline Track — Requirements

**Track:** 003-ai-pipeline-track  
**Status:** Approved  
**Last updated:** 2026-09-17

---

## Scope

This document specifies the requirements for the Cadence AI content pipeline: the functions that accept raw student material and return typed `Card[]` objects. The pipeline is stateless — it does not write to any database.

---

## Requirements

### R-01 — Retrieval-practice gate

THE system SHALL reject and retry any generated card whose `back` field shares more than 55% normalised longest-common-substring (LCS) overlap with any contiguous 50-word window of the source chunk from which it was generated.

**Pass criterion:** A card with `back = "ATP is produced by the mitochondria"` and a source chunk containing that exact phrase MUST be rejected. A card with `back = "Because oxidative phosphorylation consumes a proton gradient, blocking Complex IV halts ATP synthesis entirely"` MUST pass even if the chunk mentions ATP and Complex IV.

**Retry:** One automatic retry is permitted. If the retry also fails the gate, the card is omitted from the output and the omission is logged.

---

### R-02 — Card type variety

THE system SHALL produce at least one card of each type (`basic`, `cloze`, `mcq`) per every five source chunks processed.

**Pass criterion:** Given 5 chunks of substantive text, the output array SHALL contain ≥ 1 `basic`, ≥ 1 `cloze`, and ≥ 1 `mcq` card.

**Exception:** If a chunk is fewer than 50 words or is flagged as a heading-only section, it may be skipped without violating this requirement.

---

### R-03 — MCQ distractor quality

Each `mcq` card SHALL have exactly 3–4 options in the `options` array. Exactly one option SHALL be correct. The remaining options SHALL each reflect a plausible misconception or a near-neighbour concept — not random or unrelated text.

**Pass criterion:** For a card about why the Earth has seasons, acceptable distractors include "The Earth is closer to the Sun in summer" and "The Earth's orbit becomes more elliptical in summer". Unacceptable distractor: "The Moon reflects sunlight differently".

---

### R-04 — Explanation field

Every generated card SHALL include a non-empty `explanation` field of at least 10 words. The explanation SHALL add context beyond what is stated in `front` and `back` combined.

**Pass criterion:** An explanation of "Because the Sun's rays hit the Earth at a steeper angle in summer in the northern hemisphere, more energy per square metre is delivered to the surface" passes. An explanation of "See the answer above" fails.

---

### R-05 — JSON validity and retry

THE system SHALL validate generated JSON against the `Card` schema (as defined in `/types/index.ts`, minus DB-generated fields `id`, `due`, `stability`, `lapses`, `reps`) before returning.

On a schema validation failure, THE system SHALL retry once with a corrective follow-up message that identifies the specific validation errors.

After two failures, THE system SHALL throw a `CardGenerationError` (a typed error class) rather than returning an empty array or undefined.

**Pass criterion:** Providing a malformed JSON response from the model triggers exactly one retry. A second malformed response throws `CardGenerationError`, not a generic `Error`.

---

### R-06 — Semantic chunk boundaries

`parseContent(rawText)` SHALL split input on semantic boundaries:
- Markdown headings (`#`, `##`, `###`) or lines that are entirely uppercase (≥ 3 words)
- Double line breaks (`\n\n`)
- Inferred topic shifts (heuristic: a sentence starting with a proper noun or a new bold term after ≥ 3 prior sentences)

Chunks SHALL target 150–400 words. Short chunks (< 150 words) SHALL be merged with their preceding or following neighbour. Over-long chunks (> 400 words) SHALL be split at the sentence boundary nearest to the midpoint.

**Pass criterion:** A three-section article with sections of 80, 250, and 600 words produces chunks of approximately [~330 words (merged sections 1+2's start), ...], not three fixed-size splits. The 600-word section produces two chunks.

---

### R-07 — PDF text extraction

THE system SHALL expose a `parsePdf(buffer: Buffer): Promise<string>` function that accepts a PDF file buffer and returns extracted plain text. The text SHALL then be passed to `parseContent` for chunking.

**Pass criterion:** A single-page PDF containing 200 words of plain body text returns a string of ≥ 150 words (accounting for typical pdf-parse noise).

---

### R-08 — Vision-based image transcription

For image inputs, THE system SHALL use Claude's vision API to transcribe the image content into text before chunking. No separate OCR library SHALL be introduced.

The transcription prompt SHALL instruct the model to preserve structure (headings, lists, equations) as Markdown.

**Pass criterion:** An image of a handwritten biology notes page returns a transcribed string containing the key terms visible in the image.

---

### R-09 — Type contract

All exported types used by the AI pipeline SHALL be imported from `/types/index.ts`. No type in `/lib/ai/` may redefine a type that exists in `/types/index.ts`.

**Pass criterion:** `tsc --noEmit` passes with zero errors, and `grep -r "type Card\|interface Card" lib/` returns zero results.

---

### R-10 — Function signatures

The following function signatures are the cross-track API contract and SHALL NOT be changed without coordinating with all dependent tracks:

```typescript
// /lib/ai/parse-content.ts
export async function parseContent(rawText: string): Promise<string[]>
export async function parsePdf(buffer: Buffer): Promise<string>
export async function parseImage(imageBuffer: Buffer, mimeType: string): Promise<string>

// /lib/ai/generate-cards.ts
export async function generateCards(chunks: string[], deckId: string): Promise<Card[]>
```

**Pass criterion:** A TypeScript file that imports these functions and calls them with the above signatures compiles without errors.
