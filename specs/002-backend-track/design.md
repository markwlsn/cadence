# Design — Backend Track (002)

_Track owner: Chat 2 — Backend_

---

## 1. Data Model

### Prisma Schema (`/prisma/schema.prisma`)

SQLite for local dev; schema is Postgres-compatible (no SQLite-specific types).

```prisma
model Deck {
  id          String          @id @default(cuid())
  title       String
  sourceType  String          // 'pdf' | 'text' | 'image'
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  cards       Card[]
  reviewLogs  ReviewLogEntry[]
}

model Card {
  id           String          @id @default(cuid())
  deckId       String
  deck         Deck            @relation(fields: [deckId], references: [id], onDelete: Cascade)
  type         String          @default("basic")  // 'basic' | 'cloze' | 'mcq'
  front        String
  back         String
  explanation  String?
  options      String?         // JSON-encoded string[] for MCQ
  // FSRS fields
  due          DateTime        @default(now())
  stability    Float           @default(0)
  difficulty   Float           @default(0.3)
  lastReviewed DateTime?
  reps         Int             @default(0)
  // Internal only (not in shared Card type)
  lapses       Int             @default(0)
  state        String          @default("new")
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  reviewLogs   ReviewLogEntry[]
}

model ReviewLogEntry {
  id                String   @id @default(cuid())
  cardId            String
  card              Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  deckId            String
  deck              Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  rating            String   // 'again' | 'hard' | 'good' | 'easy'
  confidenceBefore  Int?     // 1-5 self-assessment
  reviewedAt        DateTime @default(now())
  scheduledDays     Float    @default(0)
  elapsedDays       Float    @default(0)
}
```

### Field Notes
- `Card.options` stored as JSON string (SQLite has no native array); deserialized in route handlers
- `Card.lapses` and `Card.state` are stored in DB for FSRS bookkeeping but are NOT part of the shared `Card` type — not returned by API
- `ReviewLogEntry.scheduledDays` / `elapsedDays` captured from `ts-fsrs` output for analytics

---

## 2. FSRS Integration (`/lib/fsrs.ts`)

### Library
`ts-fsrs` npm package — implements the Free Spaced Repetition Scheduler (FSRS v5) algorithm.

### Rating Mapping
```
'again' → Rating.Again (1)
'hard'  → Rating.Hard  (2)
'good'  → Rating.Good  (3)
'easy'  → Rating.Easy  (4)
```

### `scheduleCard(card: Card, rating: Rating): Card`
1. Create a `ts-fsrs` `Card` object from our `Card` type
2. Call `fsrs.repeat(tsFsrsCard, now)` to get all four rating outcomes
3. Pick the outcome matching `rating`
4. Map back to our `Card` type, updating: `due`, `stability`, `difficulty`, `lastReviewed`, `reps`
5. Return the updated card (caller persists it)

### `getMasteryQueue(deckId: string): Promise<Card[]>`
```sql
SELECT * FROM Card
WHERE deckId = ? AND due <= NOW()
ORDER BY due ASC
```
Returns cards due now, soonest-due first (most urgent).

### `getCramQueue(deckId: string, limit: number): Promise<Card[]>`

#### Cram Score Formula — Product Decision

```
cramScore = (D × difficultyWeight) / (S × stabilityWeight + 1)
```

Where:
- `D` = `difficulty` (FSRS parameter, higher = harder to learn)  
- `S` = `stability` (days to 90% retention, higher = better retained)
- `difficultyWeight` = `1.0`  — how much "inherently hard" matters
- `stabilityWeight` = `1.0`  — how much "already retained" penalizes
- `+1` — prevents division by zero for brand-new cards (S = 0)

**Rationale**: In a cram session (exam tomorrow, limited time), the optimal card to drill is one that is:
1. Objectively hard to learn (high D), AND
2. Not well retained right now (low S)

A card with high D but also high S is already known — waste of cram time. A card with low D and low S is easy to relearn quickly — lower priority. The ratio surfaces the intersection of "risky and not retained." The weights are separated so a PM can retune them in a single place without touching algorithm logic.

**Cards ranked highest-score-first, limited to `limit` (default 20).**

---

## 3. Mastery Threshold

`masteredCount` in `DeckStats` = count of cards where `stability >= 21`.

**Rationale**: FSRS's `stability` represents the number of days until 90% retention probability. A card with stability ≥ 21 days has been retained through at least one full review cycle that projects out 3 weeks — the FSRS community's conventional "graduated" threshold. This is conservative enough to exclude cards still in early learning but not so aggressive that only "ancient" cards count.

This threshold is stored as `MASTERY_STABILITY_THRESHOLD = 21` in `/lib/fsrs.ts` — easy to tune.

---

## 4. API Contract

All routes return `{ data: <payload> }` on success or `{ error: string }` on failure.

| Method | Route | Request Body | Success Response | Status |
|--------|-------|-------------|-----------------|--------|
| POST | `/api/decks` | `{ title, sourceType }` | `{ data: Deck }` | 201 |
| POST | `/api/decks/:id/ingest` | `{ rawText }` | `{ data: { chunks: string[] } }` | 200 |
| POST | `/api/decks/:id/generate` | `{ chunks: string[] }` | `{ data: { cards: Card[] } }` | 201 |
| GET | `/api/decks/:id/cards` | — | `{ data: { cards: Card[] } }` | 200 |
| GET | `/api/review/queue` | `?deckId=&mode=&limit=` | `{ data: { cards: Card[] } }` | 200 |
| POST | `/api/review/submit` | `{ cardId, rating, confidenceBefore? }` | `{ data: { card: Card } }` | 200 |
| GET | `/api/decks/:id/stats` | — | `{ data: DeckStats }` | 200 |

### Card shape returned by API
Maps Prisma `Card` to shared `Card` type, omitting internal fields (`lapses`, `state`). Dates are ISO 8601 strings.

---

## 5. Card Validation

Before persisting any card from `generateCards()`:

```typescript
function isValidCard(obj: unknown): obj is Pick<Card, 'front' | 'back'> {
  return (
    typeof obj === 'object' && obj !== null &&
    typeof (obj as any).front === 'string' && (obj as any).front.trim() !== '' &&
    typeof (obj as any).back  === 'string' && (obj as any).back.trim()  !== ''
  )
}
```

Invalid cards are logged (console.warn) and skipped — not a 500 error, but the response only contains the cards that passed validation.

---

## 6. File Structure

```
cadence/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── fsrs.ts             # scheduleCard, getMasteryQueue, getCramQueue
│   ├── ai/
│   │   ├── client.ts       # (Chat 3 owns)
│   │   ├── parse-content.ts
│   │   └── generate-cards.ts
│   └── __tests__/
│       └── fsrs.test.ts
├── app/api/
│   ├── decks/
│   │   ├── route.ts                     # POST /api/decks
│   │   └── [id]/
│   │       ├── ingest/route.ts
│   │       ├── generate/route.ts
│   │       ├── cards/route.ts
│   │       └── stats/route.ts
│   └── review/
│       ├── queue/route.ts
│       └── submit/route.ts
├── types/
│   └── index.ts            # SHARED — read only
└── specs/
    └── 002-backend-track/
        ├── README.md
        ├── requirements.md
        ├── design.md       # ← this file
        └── tasks.md
```
