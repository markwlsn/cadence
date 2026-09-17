# Spec-Driven Development Workflow

Every non-trivial feature in Cadence follows this five-phase workflow. No implementation code is written until the requirements phase is signed off.

---

## Phase 1 — Intake & Clarify

1. Read the feature brief.
2. Read `/specs/constitution.md` and identify any principle tensions.
3. Identify the **single most important open question** — the one that, if answered wrong, makes the whole design wrong.
4. Write out the answer to that question in concrete, checkable terms before proceeding. Do not leave quality bars fuzzy.

## Phase 2 — Requirements

1. Write `/specs/<track>/requirements.md`.
2. Every requirement is prefixed `R-NN` and uses SHALL/SHALL NOT language.
3. Every requirement is **testable**: there is a concrete pass/fail criterion, not a subjective judgment.
4. Get explicit sign-off before moving to Phase 3.

## Phase 3 — Design

1. Write `/specs/<track>/design.md`.
2. Document:
   - Data flow and module boundaries
   - Algorithm or prompt decisions with rationale
   - Alternatives considered and why they were rejected
3. No hand-waving. If a design decision is "TBD", that is a blocker.

## Phase 4 — Task Breakdown

1. Write `/specs/<track>/tasks.md`.
2. Each task is tagged to one or more requirements (`→ R-NN`).
3. Tasks are ordered so each builds on prior ones (no forward dependencies).

## Phase 5 — Implementation

1. Work `tasks.md` top to bottom.
2. After each task, update the checkbox.
3. If you discover a design problem, update the design doc first, then continue.
4. Run `tsc --noEmit` after every file is written.
