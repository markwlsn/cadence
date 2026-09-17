# AI Pipeline Track — Spec Seed Brief

> This directory is owned by **Chat 3 (AI Pipeline)**.
> Your first task is Phase 1: Intake & Clarify — read this brief and the project
> constitution (`/specs/constitution.md`), then draft your own `requirements.md`,
> `design.md`, and `tasks.md` before writing any implementation code.

## Scope
- Claude API client at `/lib/ai/client.ts` (server-side only)
- Card generation logic at `/lib/ai/generate-cards.ts`
- Content chunking/parsing at `/lib/ai/parse-content.ts`

## Key constraints
- The Claude API key must NEVER reach the browser. All calls are server-side only.
- Malformed AI output must raise an error — never pass unvalidated output to the DB.
- STUB markers must be removed before Phase 4.

## See also
- `/types/index.ts` — shared types contract (especially `Card`, `CardType`)
- `/specs/constitution.md` — non-negotiables and style guide
- `spec-driven-development.md` — operating methodology
