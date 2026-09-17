# AI Pipeline Track — Tasks

**Track:** 003-ai-pipeline-track  
**Status:** In progress  
**Last updated:** 2026-09-17

Tasks are ordered by dependency. Each is tagged to the requirement(s) it satisfies.

---

## T-01 — Shared types (`/types/index.ts`) → R-09, R-10

Define `CardType`, `Card`, `Deck`, `Review`, `DeckStats`, and the `CardPayload` helper type (Card minus DB fields). This is the first file created — all other files import from it.

- [x] `CardType = 'basic' | 'cloze' | 'mcq'`
- [x] `Card` with all fields including DB-generated ones
- [x] `CardPayload` (omit `id`, `due`, `stability`, `lapses`, `reps`, `deckId` — what the AI produces)
- [x] `Deck`, `Review`, `DeckStats`

---

## T-02 — Install dependencies → R-07, R-08

```bash
npm install @anthropic-ai/sdk pdf-parse dotenv
npm install --save-dev @types/pdf-parse ts-node
```

---

## T-03 — Claude client (`/lib/ai/client.ts`) → R-03 (no silent failures)

- [x] Import `Anthropic` from `@anthropic-ai/sdk`
- [x] Read `ANTHROPIC_API_KEY` from `process.env`; throw a clear error if missing
- [x] Export singleton `anthropic`
- [x] Export model name constants `GENERATION_MODEL`, `VISION_MODEL`

---

## T-04 — Quality check (`/lib/ai/quality-check.ts`) → R-01

Pure function, no I/O, no external dependencies.

- [x] `normalise(s: string): string`
- [x] `wordLcs(a: string[], b: string[]): number` — DP word-level LCS
- [x] `checkOverlap(back: string, sourceChunk: string): { pass: boolean; lcsRatio: number }`
  - Slides a 50-word window over the chunk
  - Returns max ratio seen; pass = ratio ≤ threshold
- [x] Export `QUALITY_GATE_THRESHOLD` constant (defaults to 0.55, env-overridable)

---

## T-05 — Content parsing (`/lib/ai/parse-content.ts`) → R-06, R-07, R-08, R-10

- [x] `parseContent(rawText: string): Promise<string[]>`
  - Split on heading markers
  - Split on double newlines
  - Merge short paragraphs (< 150 words) with neighbours
  - Split over-long chunks (> 400 words) at midpoint sentence boundary
  - Drop chunks < 30 words
- [x] `parsePdf(buffer: Buffer): Promise<string>` — wraps `pdf-parse`
- [x] `parseImage(imageBuffer: Buffer, mimeType: string): Promise<string>`
  - Sends image to Claude vision
  - Prompt: "Transcribe all text visible in this image. Preserve structure as Markdown."

---

## T-06 — Card generation (`/lib/ai/generate-cards.ts`) → R-01, R-02, R-03, R-04, R-05, R-10

- [x] `generateCards(chunks: string[], deckId: string): Promise<Card[]>`
- [x] System prompt encoding all five card-quality rules
- [x] Per-chunk user prompt
- [x] JSON parse with markdown fence stripping
- [x] Schema validation (`isValidCardPayload`)
- [x] LCS quality gate via `checkOverlap`
- [x] One retry with corrective message for failed cards
- [x] Throw `CardGenerationError` after two total failures
- [x] Merge passing cards with validated DB-ready fields (`deckId`, default `due`, etc.)
- [x] Export `CardGenerationError`

---

## T-07 — Test script (`/scripts/test-pipeline.ts`) → All done criteria

- [x] Load `.env.local` via `dotenv`
- [x] Embed a 300-word biology paragraph as sample text
- [x] Run `parseContent` → log chunks with word counts
- [x] Run `generateCards` → pretty-print each `Card`
- [x] Log a summary: total cards, type distribution, any failures
- [x] Add `"test:pipeline"` script to `package.json`

---

## T-08 — Verification

- [x] `npx tsc --noEmit` — zero type errors
- [ ] Manual: run `npm run test:pipeline` with a real API key, eyeball 10–15 cards
