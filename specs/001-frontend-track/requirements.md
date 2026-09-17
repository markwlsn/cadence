# Cadence Frontend — Functional Requirements

**Track:** 001-frontend-track  
**Version:** 1.0  
**Status:** Approved (auto-approved via review policy)

---

## REQ-001 Onboarding

- **REQ-001-A** WHEN a new user visits the app for the first time, THE system SHALL display an onboarding flow of 2–3 screens before routing to the home screen.
- **REQ-001-B** WHEN the onboarding flow is displayed, THE system SHALL explain the difference between Cram mode and Mastery mode in plain language.
- **REQ-001-C** WHEN a user completes or skips onboarding, THE system SHALL store a flag in `localStorage` so subsequent visits bypass onboarding.
- **REQ-001-D** WHEN onboarding is shown, THE system SHALL provide forward/back navigation and a "Skip" option.

## REQ-002 Upload / New Deck

- **REQ-002-A** WHEN a user selects "New Deck", THE system SHALL present three input methods: PDF upload, paste text, and photo upload.
- **REQ-002-B** WHEN a user submits input, THE system SHALL show a processing state (spinner + message) lasting at least 1.5 seconds (mocked).
- **REQ-002-C** WHEN processing completes, THE system SHALL redirect to the new deck's dashboard page.
- **REQ-002-D** WHEN a PDF or image is uploaded, THE system SHALL accept drag-and-drop in addition to the file picker.

## REQ-003 Home / Deck List

- **REQ-003-A** WHEN the home screen is rendered, THE system SHALL display all decks as cards in a responsive grid.
- **REQ-003-B** WHEN a deck card is rendered, THE system SHALL show the deck name, a due-count badge, and a mastery progress indicator.
- **REQ-003-C** WHEN there are no decks, THE system SHALL show an empty state with a prompt to create the first deck.
- **REQ-003-D** WHEN a user taps a deck card, THE system SHALL navigate to that deck's dashboard.

## REQ-004 Review Session

- **REQ-004-A** WHEN a review session begins, THE system SHALL display a segmented control allowing the user to choose Cram or Mastery mode.
- **REQ-004-B** WHEN a card is presented, THE system SHALL show only `Card.front` until the user reveals the answer.
- **REQ-004-C** WHEN a card is presented and before the answer is revealed, THE system SHALL prompt the user to rate their confidence on a 1–5 scale.
- **REQ-004-D** WHEN a user taps the card or a reveal button, THE system SHALL animate a flip to show `Card.back` and `Card.explanation`.
- **REQ-004-E** WHEN a card's answer is revealed, THE system SHALL show post-answer rating buttons: Again / Hard / Good / Easy (mapping to the `Rating` type).
- **REQ-004-F** WHEN a user swipes left on a card, THE system SHALL record a rating of `again`.
- **REQ-004-G** WHEN a user swipes right on a card, THE system SHALL record a rating of `easy`.
- **REQ-004-H** WHEN all cards in the queue are rated, THE system SHALL navigate to the Session Summary screen.
- **REQ-004-I** WHEN a review session is active, THE system SHALL show a progress indicator (e.g., "Card 3 of 12").

## REQ-005 Session Summary

- **REQ-005-A** WHEN a session completes, THE system SHALL display: accuracy percentage, number of cards reviewed, current streak, and when the next card is due.
- **REQ-005-B** WHEN the summary is shown, THE system SHALL provide CTAs to "Review Again" and "Back to Deck".
- **REQ-005-C** WHEN the summary accuracy is rendered, THE system SHALL animate a count-up to the final value.

## REQ-006 Deck Dashboard

- **REQ-006-A** WHEN a deck dashboard is opened, THE system SHALL display the deck name, overall mastery percentage, due-now count, and due-today count.
- **REQ-006-B** WHEN a deck has topic breakdown data, THE system SHALL display each topic with its mastery percentage and card count.
- **REQ-006-C** WHEN viewing the dashboard, THE system SHALL show a prominent "Start Review" CTA.

## REQ-007 Cross-Cutting

- **REQ-007-A** WHEN any screen is rendered, THE system SHALL support light and dark mode, following the OS `prefers-color-scheme` preference.
- **REQ-007-B** WHEN `prefers-reduced-motion` is active, THE system SHALL suppress all CSS transitions and animations.
- **REQ-007-C** WHEN any interactive element receives keyboard focus, THE system SHALL display a visible focus ring meeting WCAG AA contrast standards.
- **REQ-007-D** WHEN rendered on any viewport, THE system SHALL be fully usable from 375px (mobile) to 1440px (desktop).
- **REQ-007-E** AT ALL TIMES, components SHALL read data exclusively through `/lib/data.ts` — never via direct mock imports.
