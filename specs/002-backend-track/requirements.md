# Requirements — Backend Track (002)

_Track owner: Chat 2 — Backend_
_Based on: `/specs/constitution.md`, `/types/index.ts`, and Phase 2 brief_

---

## Intake Notes (Phase 1 Clarifications)

The following ambiguities from the brief were resolved by reading `/specs/constitution.md` and `/types/index.ts`:

| Question | Resolution |
|---|---|
| `Deck.name` or `Deck.title`? | `title` — per `types/index.ts` and constitution API table |
| `POST /api/decks` body? | `{ title, sourceType: 'pdf' \| 'text' \| 'image' }` |
| `POST /api/decks/:id/generate` body? | `{ chunks: string[] }` — Chat 3 sends chunks directly; no intermediate Chunk DB table needed |
| `ReviewLog` type name? | `ReviewLogEntry` with `{ cardId, timestamp, rating, confidenceBefore? }` |
| `DeckStats.dueCount` or `dueNow`? | `dueNow` — per `types/index.ts` |
| `DeckStats.accuracy7d` or `accuracyLast7Days`? | `accuracyLast7Days` — per `types/index.ts` |
| Mastery threshold for `masteredCount`? | `stability >= 21` (days) — FSRS community graduation cutoff; documented in design.md |
| Rating format in API body? | String literals `'again' \| 'hard' \| 'good' \| 'easy'` — per `types/index.ts` |
| `Card` has `lapses` and `state`? | Not in `types/index.ts`; omit from the shared type, store internally in DB only |
| `POST /api/review/submit` body has `confidenceBefore`? | Yes — per constitution API table |

---

## REQ-001 — Create Deck

WHEN a `POST /api/decks` request is received with a valid `{ title: string, sourceType: 'pdf' | 'text' | 'image' }` body,  
THE system SHALL persist a new `Deck` record and return `{ data: Deck }` with HTTP 201.

WHEN `title` is missing or empty,  
THE system SHALL return `{ error: "title is required" }` with HTTP 400.

## REQ-002 — Ingest Content

WHEN a `POST /api/decks/:id/ingest` request is received with `{ rawText: string }`,  
THE system SHALL call `parseContent(rawText)`, returning `{ data: { chunks: string[] } }` with HTTP 200.

WHEN the `deckId` does not exist in the database,  
THE system SHALL return `{ error: "Deck not found" }` with HTTP 404.

## REQ-003 — Generate Cards (Stub)

WHEN a `POST /api/decks/:id/generate` request is received with `{ chunks: string[] }`,  
THE system SHALL call `generateCards(chunks, deckId)`, validate each returned object against the `Card` shape, persist only valid cards, and return `{ data: { cards: Card[] } }` with HTTP 201.

IF a card returned by `generateCards` is missing `front` or `back` fields,  
THEN THE system SHALL NOT persist that card and SHALL log the rejection.

## REQ-004 — List Cards

WHEN a `GET /api/decks/:id/cards` request is received,  
THE system SHALL return `{ data: { cards: Card[] } }` for all cards belonging to that deck, with HTTP 200.

## REQ-005 — Mastery Queue

WHEN a `GET /api/review/queue?deckId=<id>&mode=mastery` request is received,  
THE system SHALL return `{ data: { cards: Card[] } }` containing only cards where `due <= now()`, ordered by `due` ascending (soonest first).

## REQ-006 — Cram Queue

WHEN a `GET /api/review/queue?deckId=<id>&mode=cram` request is received,  
THE system SHALL return `{ data: { cards: Card[] } }` ranked by cram score (see design.md §Cram Formula), limited to the `limit` query param (default: 20).

WHEN `mode` is neither `mastery` nor `cram`,  
THE system SHALL return `{ error: "mode must be 'mastery' or 'cram'" }` with HTTP 400.

## REQ-007 — Submit Review

WHEN a `POST /api/review/submit` request is received with `{ cardId, rating, confidenceBefore? }`,  
THE system SHALL call `scheduleCard(card, rating)`, persist the updated card fields, write a `ReviewLogEntry` row, and return `{ data: { card: Card } }` with HTTP 200.

WHEN `rating` is not one of `'again' | 'hard' | 'good' | 'easy'`,  
THE system SHALL return `{ error: "invalid rating" }` with HTTP 400.

WHEN `cardId` does not exist,  
THE system SHALL return `{ error: "Card not found" }` with HTTP 404.

## REQ-008 — Schedule: Again/Hard shortens interval

WHEN `scheduleCard` is called with rating `'again'`,  
THE system SHALL return a card whose `due` field is no more than 24 hours from now.

WHEN `scheduleCard` is called with rating `'hard'`,  
THE system SHALL return a card whose `due` interval is less than the card's current stability.

## REQ-009 — Schedule: Good/Easy extends interval

WHEN `scheduleCard` is called with rating `'good'`,  
THE system SHALL return a card whose `due` field is at least 1 day from now.

WHEN `scheduleCard` is called with rating `'easy'`,  
THE system SHALL return a card whose `due` interval is greater than a `'good'` rating on the same card.

## REQ-010 — Deck Stats

WHEN a `GET /api/decks/:id/stats` request is received,  
THE system SHALL return `{ data: DeckStats }` where:
- `totalCards` = total card count for the deck
- `dueNow` = count of cards with `due <= now()`
- `masteredCount` = count of cards with `stability >= 21`
- `accuracyLast7Days` = (good + easy ratings in last 7 days) / (total ratings in last 7 days), or `null` if no reviews in 7 days

## REQ-011 — AI Stub Signatures

The system SHALL export from `/lib/ai/parse-content.ts`:
```typescript
export async function parseContent(rawText: string): Promise<string[]>
```

The system SHALL export from `/lib/ai/generate-cards.ts`:
```typescript
export async function generateCards(chunks: string[], deckId: string): Promise<Card[]>
```

Both stubs SHALL be replaceable in Phase 4 without modifying any route code.

## REQ-012 — API Response Format & Contract Alignment

THE system SHALL return successful HTTP responses matching the `/specs/constitution.md` API contract table directly (`Deck`, `Card[]`, `DeckStats`, etc.) to align across `/lib/data.ts` and API consumers.
THE system SHALL return all error responses as `{ error: string }` with an appropriate HTTP 4xx or 5xx status code.

> **Phase 7 Spec Sync (2026-09-17):**
> Harmonized REQ-012 with `/specs/constitution.md` API table. To eliminate unnecessary object nesting and maintain clean TypeScript typing across the `/lib/data.ts` seam, successful responses return typed payloads directly rather than wrapping in `{ data: ... }`. Error responses retain `{ error: string }`.

## REQ-013 — Card Validation Before Persist

IF `generateCards()` returns an object lacking `front` or `back` as non-empty strings,  
THEN THE system SHALL NOT write that object to the database.

## REQ-014 — Seed Data

THE system SHALL provide a seed script at `/prisma/seed.ts` that:
- Inserts at least 2 decks
- Inserts at least 8 cards with varying `stability` and `difficulty` values
- Produces visibly different orderings for mastery queue vs cram queue on the same deck
