# Requirements — Integration & Deploy Track (004)

**Track:** 004-integration-deploy  
**Status:** Approved  
**Last updated:** 2026-09-17  
**Parent:** `/specs/constitution.md`, `/specs/spec-driven-development.md`

---

## Scope

This document specifies the integration, end-to-end verification, data-layer seam transition, database migration, and production deployment requirements for Cadence. It serves as the unifying contract ensuring that Tracks 001 (Frontend), 002 (Backend), and 003 (AI Pipeline) work together without regression or mock contamination.

---

## REQ-INT-001: Branch Integration Sequence
- **REQ-INT-001-A** WHEN merging track branches into `main`, THE system SHALL merge `track/backend` first, `track/ai-pipeline` second, and `track/frontend` last.
- **REQ-INT-001-B** IF any track branch introduces changes that conflict with `/types/index.ts`, THEN THE conflicting track SHALL be adjusted to adhere to the shared contract without modifying `/types/index.ts`.

---

## REQ-INT-002: Data Access Seam Transition
- **REQ-INT-002-A** AT ALL TIMES in production (`NODE_ENV === 'production'`), `/lib/data.ts` SHALL fulfill data requests exclusively via HTTP `fetch()` calls against `/api/**` routes.
- **REQ-INT-002-B** WHILE in local development (`NODE_ENV === 'development'`), `/lib/data.ts` SHALL only use `/lib/mocks/` IF `USE_MOCKS === 'true'`.
- **REQ-INT-002-C** WHEN running in server-side execution contexts (e.g. Next.js Server Components), `/lib/data.ts` SHALL construct absolute URLs using environment-aware base URL resolution (`NEXT_PUBLIC_APP_URL` or `VERCEL_URL` or `localhost:3000`).

---

## REQ-INT-003: AI Pipeline Production Wiring
- **REQ-INT-003-A** WHEN `generateCards(chunks, deckId)` is called, THE system SHALL invoke the Claude API with the system prompt and LCS quality gate defined in Track 003.
- **REQ-INT-003-B** AT NO TIME in production paths SHALL `generateCards` return hardcoded, stubbed, or fabricated flashcards.
- **REQ-INT-003-C** WHEN `POST /api/decks/:id/ingest` receives a `multipart/form-data` request with a PDF or image file, THE system SHALL parse the file buffer using `parsePdf` or `parseImage` before semantic chunking.

---

## REQ-INT-004: End-to-End Review & Scheduling
- **REQ-INT-004-A** WHEN a user reviews cards in Mastery mode, THE system SHALL serve cards where `due <= now()`, ordered by `due` ascending.
- **REQ-INT-004-B** WHEN a user reviews cards in Cram mode, THE system SHALL rank cards according to the Cram prioritization formula (`stability` vs `difficulty`).
- **REQ-INT-004-C** WHEN a user submits a review rating, THE system SHALL update the card's FSRS parameters (`due`, `stability`, `difficulty`, `reps`, `lastReviewed`) in the database and append a `ReviewLogEntry`.
- **REQ-INT-004-D** WHEN a review session finishes, THE system SHALL calculate and display true session statistics (accuracy, count, streak, due date) derived from the session log.

---

## REQ-INT-005: QA Tester Agent Verification
- **REQ-INT-005-A** BEFORE deployment, a dedicated QA agent SHALL execute happy-path and boundary tests against the integrated application.
- **REQ-INT-005-B** IF any Critical or High severity issues are reported by the QA agent, THE system SHALL resolve them and perform narrow regression tests before proceeding to deployment.

---

## REQ-INT-006: Serverless Database Migration
- **REQ-INT-006-A** FOR production deployment, THE system SHALL migrate from local SQLite (`dev.db`) to a persistent remote database (Turso libSQL or PostgreSQL).
- **REQ-INT-006-B** WHEN initializing the production database, THE system SHALL run migrations and seed verification without data loss.

---

## REQ-INT-007: Production Deployment & Verification
- **REQ-INT-007-A** WHEN building for production (`npm run build`), THE Next.js build SHALL compile with zero TypeScript errors and zero lint errors.
- **REQ-INT-007-B** WHEN deployed to Vercel, all core user flows (deck creation, ingestion, review, stats) SHALL be operable on the live deployment URL.
