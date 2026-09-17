# Project Constitution — Cadence

## Stack & Conventions
Next.js 14+ (App Router), TypeScript, Tailwind (token-configured, see design tokens
below), Prisma + SQLite (local dev; migrates to Turso before deploy — see Phase 4).
Claude API for all generation. ts-fsrs for scheduling.

## Testing Philosophy
Every task that adds or changes behavior ships with a test encoding its acceptance
criteria, written alongside the code, not after. Manual click-through is not a
substitute for an automated test on anything touching scheduling logic or the
AI generation contract.

## Non-Negotiables
- Never call the Claude API from client-side code — server routes only, key never
  exposed to the browser.
- Never persist a card to the DB without validating it matches the `Card` type
  from `/types/index.ts` first — malformed AI output must be caught, not stored.
- Never silently change a shared type in `/types/index.ts` mid-project — that's a
  cross-track breaking change and needs a Change Log entry and a heads-up in all
  3 track chats.
- Never fabricate or hardcode "example" AI-generated content that looks real in
  production code paths — stubs must be clearly marked STUB and removed by Phase 4.
- Destructive actions (schema migrations, deleting seed data, force-push) always
  get explicit confirmation, even in autonomous mode.

## Style Guide
Match existing repo formatting (Prettier defaults). Component files colocated with
their styles. No inline magic numbers for spacing — use the design tokens.

## Design Tokens
```css
--bg: #FBFBFD;         --bg-dark: #000000;
--surface: #FFFFFF;    --surface-dark: #1C1C1E;
--text: #1D1D1F;       --text-dark: #F5F5F7;
--text-secondary: #6E6E73;
--accent: #0A84FF;     /* primary */
--accent-2: #34C759;   /* mastery / success */
--accent-3: #FF9F0A;   /* cram / urgency */
--radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px;
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
```

## API Contract
| Method | Route | Body | Returns |
|--------|-------|------|---------|
| POST | `/api/decks` | `{ title, sourceType }` | `Deck` |
| POST | `/api/decks/:id/ingest` | `{ rawText }` or file upload | `{ chunks: string[] }` |
| POST | `/api/decks/:id/generate` | `{ chunks: string[] }` | `Card[]` |
| GET | `/api/decks/:id/cards` | — | `Card[]` |
| GET | `/api/review/queue?deckId=&mode=` | — | `Card[]` (due now) |
| POST | `/api/review/submit` | `{ cardId, rating, confidenceBefore }` | updated `Card` |
| GET | `/api/decks/:id/stats` | — | `DeckStats` |

## Track Ownership
| Path | Owner |
|------|-------|
| `/app/(pages)/` | Chat 1 — Frontend |
| `/components/ui/`, `/components/review/` | Chat 1 — Frontend |
| `/lib/mocks/` | Chat 1 — Frontend |
| `/app/api/**` | Chat 2 — Backend |
| `/lib/db.ts`, `/lib/fsrs.ts` | Chat 2 — Backend |
| `/prisma/` | Chat 2 — Backend |
| `/lib/ai/` | Chat 3 — AI Pipeline |
| `/types/index.ts` | **SHARED — all tracks read, no track owns** |
| `/specs/constitution.md` | **SHARED — written in Phase 0, read-only after** |
