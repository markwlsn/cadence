# Backend Track — Spec Seed Brief

> This directory is owned by **Chat 2 (Backend)**.
> Your first task is Phase 1: Intake & Clarify — read this brief and the project
> constitution (`/specs/constitution.md`), then draft your own `requirements.md`,
> `design.md`, and `tasks.md` before writing any implementation code.

## Scope
- All API routes under `/app/api/`
- Prisma client singleton at `/lib/db.ts`
- FSRS scheduling logic at `/lib/fsrs.ts`
- Prisma schema at `/prisma/schema.prisma`

## Key constraint
Validate every Card against the `/types/index.ts` `Card` type before persisting.
Never store malformed AI output.

## See also
- `/types/index.ts` — shared types contract
- `/specs/constitution.md` — non-negotiables and style guide
- `spec-driven-development.md` — operating methodology
