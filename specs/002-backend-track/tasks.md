# Tasks — Backend Track (002)

_Ordered implementation checklist. Each task tagged to requirement(s)._

---

## Component A: Dependencies & Environment

- [x] **A1** Install `prisma`, `@prisma/client`, `ts-fsrs` — [REQ-001..014]
- [x] **A2** Create `.env` with `DATABASE_URL="file:./dev.db"` — [REQ-001]
- [x] **A3** Add `prisma` script to `package.json` and seed script config — [REQ-014]

## Component B: Prisma Schema & Migration

- [x] **B1** Write `/prisma/schema.prisma` (Deck, Card, ReviewLogEntry models) — [REQ-001, REQ-007]
- [x] **B2** Run `prisma migrate dev --name init` to create SQLite dev.db — [REQ-001]
- [x] **B3** Verify migration runs clean — [REQ-001]

## Component C: DB Singleton

- [x] **C1** Implement `/lib/db.ts` Prisma client singleton (global instance for Next.js hot-reload) — [REQ-001..010]

## Component D: FSRS Scheduling Engine

- [x] **D1** Implement `scheduleCard(card, rating)` in `/lib/fsrs.ts` — [REQ-007, REQ-008, REQ-009]
- [x] **D2** Implement `getMasteryQueue(deckId)` — [REQ-005]
- [x] **D3** Implement `getCramQueue(deckId, limit)` with documented cram formula — [REQ-006]
- [x] **D4** Export `MASTERY_STABILITY_THRESHOLD = 21` — [REQ-010]

## Component E: AI Stub Files

- [x] **E1** Implement stub `parseContent` in `/lib/ai/parse-content.ts` — [REQ-002, REQ-011]
- [x] **E2** Implement stub `generateCards` in `/lib/ai/generate-cards.ts` — [REQ-003, REQ-011, REQ-013]

## Component F: API Routes

- [x] **F1** `POST /api/decks` → create deck — [REQ-001, REQ-012]
- [x] **F2** `POST /api/decks/:id/ingest` → parse content stub — [REQ-002, REQ-012]
- [x] **F3** `POST /api/decks/:id/generate` → generate + validate + persist cards — [REQ-003, REQ-012, REQ-013]
- [x] **F4** `GET /api/decks/:id/cards` → list cards — [REQ-004, REQ-012]
- [x] **F5** `GET /api/review/queue` → mastery or cram queue — [REQ-005, REQ-006, REQ-012]
- [x] **F6** `POST /api/review/submit` → schedule + persist + log — [REQ-007, REQ-012]
- [x] **F7** `GET /api/decks/:id/stats` → compute DeckStats — [REQ-010, REQ-012]

## Component G: Seed Script

- [x] **G1** Write `/prisma/seed.ts` (2 decks, 8+ cards with varied stability/difficulty) — [REQ-014]
- [x] **G2** Run seed and verify data in dev.db — [REQ-014]

## Component H: Tests

- [x] **H1** Write `/lib/__tests__/fsrs.test.ts` covering:
  - 'again' → due within 24h [REQ-008]
  - 'hard' → interval less than current stability [REQ-008]
  - 'good' → due at least 1 day out [REQ-009]
  - 'easy' → interval greater than 'good' on same card [REQ-009]
  - Cram queue order differs from mastery queue order [REQ-005, REQ-006]
- [x] **H2** Run tests and confirm all pass

## Component I: Verification

- [ ] **I1** Start `next dev`, confirm server boots — [all]
- [ ] **I2** curl `POST /api/decks` — [REQ-001]
- [ ] **I3** curl `POST /api/decks/:id/ingest` — [REQ-002]
- [ ] **I4** curl `POST /api/decks/:id/generate` — [REQ-003]
- [ ] **I5** curl `GET /api/decks/:id/cards` — [REQ-004]
- [ ] **I6** curl `GET /api/review/queue?mode=mastery` and `?mode=cram` — [REQ-005, REQ-006]
- [ ] **I7** curl `POST /api/review/submit` — [REQ-007]
- [ ] **I8** curl `GET /api/decks/:id/stats` — [REQ-010]
