# Cadence Frontend — Task Breakdown

**Track:** 001-frontend-track

Each task references the requirement(s) it implements.

---

## T-01 — Foundation & Types
**Requirements:** REQ-007-A, REQ-007-E  
**Files:** `/types/index.ts`, `app/globals.css`, `app/layout.tsx`  
Create shared TypeScript types, design tokens, and updated root layout.

## T-02 — Design System Primitives
**Requirements:** REQ-007-A through REQ-007-D  
**Files:** `components/ui/Button.tsx`, `Card.tsx`, `SegmentedControl.tsx`, `BottomSheet.tsx`, `Badge.tsx`, `ProgressRing.tsx`, `VisuallyHidden.tsx`, `index.ts`  
Build the reusable primitive components all screens share.

## T-03 — Mock Data
**Requirements:** REQ-007-E  
**Files:** `lib/mocks/decks.ts`, `lib/mocks/cards.ts`, `lib/mocks/stats.ts`  
Author fixture data: 2 decks, 16–20 cards (mixed types, varied due dates), per-deck stats.

## T-04 — Data Access Layer
**Requirements:** REQ-007-E  
**Files:** `lib/data.ts`  
Implement the async data-access functions that abstract mock reads. This is the Phase 4 seam.

## T-05 — Onboarding Screen
**Requirements:** REQ-001-A through REQ-001-D  
**Files:** `app/onboarding/page.tsx`  
2–3 step onboarding flow with localStorage persistence.

## T-06 — Home / Deck List
**Requirements:** REQ-003-A through REQ-003-D  
**Files:** `app/page.tsx`  
Server component rendering deck grid with due counts and mastery rings.

## T-07 — Upload / New Deck
**Requirements:** REQ-002-A through REQ-002-D  
**Files:** `app/decks/new/page.tsx`  
Three-method input with mocked processing state.

## T-08 — Review Components
**Requirements:** REQ-004-A through REQ-004-I  
**Files:** `components/review/CardStack.tsx`, `FlashCard.tsx`, `ConfidenceRater.tsx`, `RatingButtons.tsx`, `ModeToggle.tsx`  
All interactive review sub-components.

## T-09 — Review Session Screen
**Requirements:** REQ-004-A through REQ-004-I  
**Files:** `app/decks/[id]/review/page.tsx`  
Orchestrates the session state machine using review components.

## T-10 — Session Summary
**Requirements:** REQ-005-A through REQ-005-C  
**Files:** `app/decks/[id]/review/summary/page.tsx`  
Animated summary stats with CTAs.

## T-11 — Deck Dashboard
**Requirements:** REQ-006-A through REQ-006-C  
**Files:** `app/decks/[id]/page.tsx`  
Per-deck mastery view with topic breakdown.

## T-12 — Quality Pass
**Requirements:** REQ-007-A through REQ-007-D  
Verify: dark mode, focus states, reduced-motion, responsive layout, no direct mock imports.
