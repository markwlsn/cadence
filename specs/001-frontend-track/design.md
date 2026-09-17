# Cadence Frontend — Design Document

**Track:** 001-frontend-track  
**Version:** 1.0

---

## Architecture Overview

```
app/                          (Next.js App Router — routes only)
├── layout.tsx                (root layout, ThemeProvider)
├── page.tsx                  (home / deck list — Server Component)
├── onboarding/page.tsx       (onboarding — Client Component)
├── decks/
│   ├── new/page.tsx          (upload / new deck — Client Component)
│   └── [id]/
│       ├── page.tsx          (deck dashboard — Server Component)
│       └── review/
│           ├── page.tsx      (review session — Client Component)
│           └── summary/page.tsx (session summary — Client Component)

components/
├── ui/                       (design system primitives)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── SegmentedControl.tsx
│   ├── BottomSheet.tsx
│   ├── Badge.tsx
│   ├── ProgressRing.tsx
│   ├── VisuallyHidden.tsx
│   └── index.ts
└── review/                   (review-specific components)
    ├── CardStack.tsx
    ├── FlashCard.tsx
    ├── ConfidenceRater.tsx
    ├── RatingButtons.tsx
    └── ModeToggle.tsx

lib/
├── data.ts                   (async data-access layer — THE seam)
└── mocks/
    ├── decks.ts
    ├── cards.ts
    └── stats.ts

types/
└── index.ts                  (single source of truth for all types)
```

## State Management

- **No global state library.** All state is local.
- **Server Components** (`app/page.tsx`, `app/decks/[id]/page.tsx`) call `lib/data.ts` directly (async functions).
- **Client Components** receive data as props from Server Component parents, or call `lib/data.ts` inside `useEffect`.
- **Review session state** (`currentCardIndex`, `ratings`, `mode`) lives in local `useState` inside `app/decks/[id]/review/page.tsx`.
- **Session ID** is threaded to Summary via URL param: `/decks/[id]/review/summary?sessionId=xxx`.
- **Onboarding seen flag** stored in `localStorage('cadence_onboarding_complete')`.
- **Theme** follows OS `prefers-color-scheme` via CSS `@media` — no JS toggle needed in Phase 1.

## Data Layer Abstraction (`/lib/data.ts`)

All functions are `async` returning `Promise<T>`. In Phase 1 they read from `lib/mocks/`. In Phase 4 they will `fetch()` the real API. **Call sites don't change.**

```ts
// Phase 1 internals (mock reads)  →  Phase 4 internals (fetch calls)
// Call signature stays identical

getDecks(): Promise<Deck[]>
getDeck(id: string): Promise<Deck | null>
getDeckStats(deckId: string): Promise<DeckStats>
getQueue(deckId: string, mode: StudyMode): Promise<Card[]>
submitRating(sessionId: string, payload: ReviewRating): Promise<void>
getSessionSummary(sessionId: string): Promise<SessionSummary>
createDeck(input: CreateDeckInput): Promise<Deck>
```

## Review Session State Machine

```
idle
  └─[start]──→ confidence-rating    (show card front + 1–5 rater)
                  └─[confidence selected]──→ revealing    (flip animation)
                                                └─[flip complete]──→ answer-rating    (Again/Hard/Good/Easy)
                                                                        └─[rating selected]──→ idle (next card)
                                                                                               OR
                                                                        └─[last card rated]──→ session-end (→ summary)
```

## Design System

### Tokens
All tokens defined in `app/globals.css` as CSS custom properties, extended via Tailwind `@theme inline`.

### Typography Scale (Geist Sans)
- Display: 34px/40px, weight 700
- Title: 22px/28px, weight 600  
- Body: 17px/24px, weight 400
- Caption: 13px/18px, weight 400
- Footnote: 11px/14px, weight 400

### 8pt Spacing Grid
All spacing values are multiples of 8px (or 4px for fine-grained within components).

### Motion
- One deliberate transition per interaction.
- Card flip: `transform rotateY(180deg)`, `transition: transform 250ms ease-in-out`.
- Bottom sheet: `transform translateY(0)`, `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)`.
- All suppressed when `prefers-reduced-motion: reduce`.

### Dark Mode Strategy
Tailwind `darkMode: 'media'` (CSS `@media (prefers-color-scheme: dark)`). Dark variants on every custom token. No JS class toggling needed in Phase 1.
