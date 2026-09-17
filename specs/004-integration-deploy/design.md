# Design Document — Integration & Deploy Track (004)

**Track:** 004-integration-deploy  
**Status:** Approved  
**Last updated:** 2026-09-17  
**Parent:** `/specs/constitution.md`, `/specs/004-integration-deploy/requirements.md`

---

## 1. System Architecture Post-Merge

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (16+)                        │
│                                                                        │
│   Frontend Pages (React 19)            API Routes (Edge & Serverless)   │
│   ├── /                                ├── GET /api/decks              │
│   ├── /decks/[id]                      ├── POST /api/decks             │
│   ├── /decks/[id]/review               ├── GET /api/decks/[id]         │
│   ├── /decks/[id]/review/summary       ├── GET /api/decks/[id]/cards   │
│   └── /decks/new                       ├── GET /api/decks/[id]/stats   │
│                                        ├── POST /api/decks/[id]/ingest │
│   Data Seam (/lib/data.ts)             ├── POST /api/decks/[id]/generate│
│   ├── SSR: Base URL resolution         ├── GET /api/review/queue       │
│   └── Client: standard fetch()         └── POST /api/review/submit     │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│           AI Pipeline Layer          │ │     Persistence Layer         │
│  ├── /lib/ai/client.ts (Anthropic)   │ │  ├── Prisma Client (v6)       │
│  ├── /lib/ai/generate-cards.ts (LCS) │ │  ├── SQLite (Local Dev)       │
│  └── /lib/ai/parse-content.ts (Vision│ │  └── Turso / LibSQL (Prod)    │
│       & pdf-parse)                   │ │  └── /lib/fsrs.ts (ts-fsrs)   │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Branch Merging Strategy & Conflict Resolution
1. **Branch Order**:
   - `track/backend` merges into `main` first (provides database schema, migrations, routes, FSRS engine).
   - `track/ai-pipeline` merges into `main` second (provides chunking, vision/PDF parsing, Claude card generator).
   - `track/frontend` merges into `main` last (provides UI layouts, components, review stack, onboarding).
2. **Contract Invariance**:
   - `/types/index.ts` is the single source of truth. If any branch deviated in naming (e.g. `Deck.name` vs `Deck.title`, `dueCount` vs `dueNow`), the branch code is corrected to conform to `/types/index.ts`.

---

## 3. Data Access Seam (`/lib/data.ts`)
- The frontend interacts solely through `/lib/data.ts`.
- Server Components (`app/page.tsx`, `app/decks/[id]/page.tsx`) call `/lib/data.ts`. To ensure robust execution across local server runtime, SSR, and Vercel serverless functions:
  ```typescript
  function getBaseUrl(): string {
    if (typeof window !== 'undefined') return ''; // Browser relative
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  ```
- Mock data in `/lib/mocks/` is loaded dynamically only when:
  ```typescript
  const USE_MOCKS = process.env.NODE_ENV === 'development' && process.env.USE_MOCKS === 'true';
  ```
  In production, mock fixtures are completely eliminated from bundle paths.

---

## 4. Multi-part Ingestion & Generation Flow
1. **File & Text Upload**:
   - In `app/decks/new/page.tsx`, text input submits `{ rawText }` to `/api/decks/:id/ingest`.
   - File uploads (PDF or image) submit `FormData` containing the file to `/api/decks/:id/ingest`.
2. **Ingest Processing**:
   - `/api/decks/:id/ingest` checks `content-type`:
     - If JSON: passes `rawText` directly to `parseContent(rawText)`.
     - If `multipart/form-data`: inspects file MIME type. For PDFs, uses `parsePdf(buffer)`; for images, uses `parseImage(buffer, mimeType)`. The extracted text is then chunked via `parseContent`.
3. **Card Generation**:
   - Chunks are passed to `/api/decks/:id/generate`.
   - `generateCards(chunks, deckId)` executes the Claude API prompt, validates JSON against `CardPayload`, verifies LCS overlap threshold (≤ 55%), persists valid cards to the database, and returns `Card[]`.

---

## 5. Review Sessions & FSRS Scheduling
- **Mastery Mode**:
  `GET /api/review/queue?deckId=&mode=mastery` queries cards with `due <= now()`, ordered by `due ASC`.
- **Cram Mode**:
  `GET /api/review/queue?deckId=&mode=cram` sorts cards prioritizing highest difficulty and lowest stability:
  $$\text{Cram Score} = \text{difficulty} - \text{stability}$$
- **Review Submission**:
  `POST /api/review/submit` executes `scheduleCard(card, rating)`, updates `due`, `stability`, `difficulty`, `reps`, and records a `ReviewLogEntry` row for accurate 7-day retention accuracy calculation.

---

## 6. Remote Database Architecture (Turso / LibSQL)
- SQLite local database (`dev.db`) cannot persist state across stateless Vercel function instances.
- For deployment:
  - Migrate datasource to Turso libSQL using `@prisma/adapter-libsql` and `@libsql/client` (or Postgres URL).
  - Deploy schema migrations via `prisma migrate deploy` or `prisma db push`.
  - Execute seed script (`prisma/seed.ts`) to confirm live remote database functionality.
