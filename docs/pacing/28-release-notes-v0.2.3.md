# Release Notes: Cadence v0.2.3
**Release Date**: October 22, 2026

### Key Features & Enhancements
1. **Deck Exam Date Pacing**: Target exam dates now persist directly on the `Deck` model with automatic countdowns, daily card and quiz targets, and dynamic status badges.
2. **Multiple Cloze Alternatives**: Fill-in-the-blank clozes now accept pipe-separated alternatives (`color|colour`) with tiered Levenshtein typo grading.
3. **Hardened API Routes**: Input payload size enforcement, auth-aware rate limits, and trusted reverse proxy IP resolution.
4. **Comprehensive Test Suite**: Expanded canonical unit tests from 94 to 111 tests with 100% pass rate.
