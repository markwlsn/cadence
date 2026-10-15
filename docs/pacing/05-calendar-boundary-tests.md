# Leap Year & Month Rollover Boundary Tests
- **Month Rollover**: From `2026-10-31` to `2026-11-01` yields `1` day remaining.
- **Leap Day Transition**: From `2024-02-28` to `2024-02-29` in leap year yields `1` day remaining.
- **Leap Month Boundary**: From `2024-02-28` to `2024-03-01` in leap year yields `2` days remaining.
All edge cases verified in `scripts/test-unit.ts`.
