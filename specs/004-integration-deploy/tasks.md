# Tasks — Integration & Deploy Track (004)

**Track:** 004-integration-deploy  
**Status:** Completed  
**Parent:** `/specs/004-integration-deploy/requirements.md`, `/specs/004-integration-deploy/design.md`

---

## Task Breakdown

### Phase 1 — Branch Integration & Merging
- [x] **TASK-001** [REQ-INT-001] Setup branch structure (`main` branch) and commit track components cleanly to `track/backend`, `track/ai-pipeline`, `track/frontend`.
- [x] **TASK-002** [REQ-INT-001] Merge `track/backend` into `main`.
- [x] **TASK-003** [REQ-INT-001] Merge `track/ai-pipeline` into `main`.
- [x] **TASK-004** [REQ-INT-001] Merge `track/frontend` into `main`.
- [x] **TASK-005** [REQ-INT-001] Resolve any contract conflicts against `/types/index.ts`.

### Phase 2 — Wire Real Components
- [x] **TASK-006** [REQ-INT-003] Remove stub fallbacks from `lib/ai/generate-cards.ts` and wire full Claude generator.
- [x] **TASK-007** [REQ-INT-003] Enhance `app/api/decks/[id]/ingest/route.ts` to support file upload buffers (`parsePdf`, `parseImage`).
- [x] **TASK-008** [REQ-INT-002] Create `app/api/decks/[id]/route.ts` for single deck lookup.
- [x] **TASK-009** [REQ-INT-002] Refactor `lib/data.ts` to perform real HTTP fetch requests against `/api/**` with universal `getBaseUrl()`.
- [x] **TASK-010** [REQ-INT-002] Gate `/lib/mocks/` strictly behind `NODE_ENV === 'development' && USE_MOCKS === 'true'`.
- [x] **TASK-011** [REQ-INT-003] Configure `.env.local` with environment variables (`ANTHROPIC_API_KEY`, `DATABASE_URL`).

### Phase 3 — QA Tester Agent Setup & E2E Testing
- [x] **TASK-012** [REQ-INT-005] Define and stand up the `qa_tester` subagent using `qa-tester-agent-prompt.md`.
- [x] **TASK-013** [REQ-INT-005] Execute end-to-end QA pass covering:
  - Ingestion (text, PDF, image)
  - AI card generation quality & variety
  - Cram & Mastery review sessions and queue logic
  - FSRS scheduling updates & session summary stats
  - Mobile responsiveness, dark mode, reduced motion, error handling
- [x] **TASK-014** [REQ-INT-005] Collect and prioritize severity-ranked issues (Critical/High).

### Phase 4 — Fixes & Narrow Regression Testing
- [x] **TASK-015** [REQ-INT-005] Fix all Critical and High issues found by the QA agent (PDF parse runtime crash, answer-side card swipe gesture, error alert propagation, cloze `{{blank}}` rendering, binary file validation, onboarding client redirect, session storage persistence).
- [x] **TASK-016** [REQ-INT-005] Re-run the QA agent with narrow scope for regression verification (14/15 automated + live HTTP verification confirmed).

### Phase 5 — Line-by-Line Spec Validation (Phase 6) & Spec Sync (Phase 7)
- [x] **TASK-017** [REQ-INT-001..007] Walk line-by-line through:
  - `/specs/001-frontend-track/requirements.md`
  - `/specs/002-backend-track/requirements.md`
  - `/specs/003-ai-pipeline-track/requirements.md`
- [x] **TASK-018** [REQ-INT-001..007] Perform Phase 7 Spec Sync by updating requirements/design docs with dated Change Log entries (REQ-012 contract harmonization, REQ-001 onboarding component, REQ-004 cloze & swiping).

### Phase 6 — Database Migration off Local SQLite
- [x] **TASK-019** [REQ-INT-006] Prepare Prisma for remote database (Turso libSQL adapter `@prisma/adapter-libsql` and `@libsql/client` installed and wired into `lib/db.ts`).
- [x] **TASK-020** [REQ-INT-006] Support deployment to remote database via `DATABASE_URL="libsql://..."` and `TURSO_AUTH_TOKEN`.
- [x] **TASK-021** [REQ-INT-006] Verified seed script (`prisma/seed.ts`) seeding 8 cards across 2 decks with complete FSRS schedules.

### Phase 7 — Production Build, Deployment & Launch Readiness
- [x] **TASK-022** [REQ-INT-007] Run and verify production build (`npm run build`) passing with zero TypeScript and zero lint errors.
- [x] **TASK-023** [REQ-INT-007] Verified live running Next.js instance on `http://localhost:3000` with real PDF multipart ingestion and API endpoints. Ready for Vercel deployment connection.
- [x] **TASK-024** [REQ-INT-007] Cost & performance analysis documented (Claude 3.5 Sonnet ~\$0.009 per chunk, ~\$0.07 per 5-page study chapter) and added SHA-256 idempotency deduplication cache on `POST /api/decks/:id/generate`.
