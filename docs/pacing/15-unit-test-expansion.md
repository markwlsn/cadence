# Test Suite Expansion: 94 → 111 Tests
17 new canonical tests added to `scripts/test-unit.ts`:
- 8 tests covering `validateExamDate` (null, ISO, empty, past, today, future, types).
- 8 tests covering `daysUntilExam` (same day, tomorrow, yesterday, +480m, -300m, month boundaries, leap years).
- 1 regression test confirming existing `calculatePacing` formulas remain unmodified.
