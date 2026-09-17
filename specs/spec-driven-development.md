# Spec-Driven Development Workflow

Every significant feature or track in Cadence follows this five-phase workflow before touching implementation code.

---

## Phase 1 — Intake & Clarify

1. Read the brief (task description, this file, and `constitution.md`)
2. Identify ambiguities: unclear thresholds, missing field definitions, conflicting assumptions
3. Flag them explicitly as **Open Questions** in the requirements doc before drafting requirements
4. Do not write any implementation code during this phase

**Output**: A list of open questions resolved with the user or product owner.

---

## Phase 2 — Requirements

Write `/specs/<track>/requirements.md` using **EARS** (Easy Approach to Requirements Syntax):

| Pattern | Template |
|---|---|
| Ubiquitous | The system SHALL... |
| Event-driven | WHEN `<trigger>`, THE system SHALL... |
| State-driven | WHILE `<state>`, THE system SHALL... |
| Optional feature | WHERE `<feature>`, THE system SHALL... |
| Unwanted behaviour | IF `<condition>`, THEN THE system SHALL NOT... |

Requirements must be:
- **Testable** — you can write a passing/failing test for each one
- **Atomic** — one requirement, one behaviour
- **Numbered** — `REQ-001`, `REQ-002`, …

**Output**: `/specs/<track>/requirements.md` — get sign-off before Phase 3.

---

## Phase 3 — Design

Write `/specs/<track>/design.md` covering:
- Data model changes
- Key algorithms with explicit formulae (not just prose)
- API contract (method, path, request body, response shape, error codes)
- Any product decisions that are embedded in engineering choices (e.g. Cram Mode ranking formula) — document the **rationale** so a human can retune it

**Output**: `/specs/<track>/design.md` — get sign-off before Phase 4.

---

## Phase 4 — Task Breakdown

Write `/specs/<track>/tasks.md`:
- Ordered task list, each tagged to at least one requirement (`REQ-xxx`)
- Group by component (DB, engine, API, stubs, tests)
- Mark the critical path clearly

**Output**: `/specs/<track>/tasks.md`

---

## Phase 5 — Implementation

Work `tasks.md` top to bottom:
- Mark tasks `[/]` (in-progress) → `[x]` (done)
- Checkpoint after each component: run tests, verify the server starts
- If a discovery forces a significant design change, update `design.md` and flag it before continuing
