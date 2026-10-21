# Security & Rate Limiting Audit Summary
- `TRUSTED_PROXY=1` support configured in `lib/rate-limit.ts`.
- In-memory rate limiting sliding window retained for 660 seconds.
- Body limits capped at 20,000 characters with 413 Payload Too Large protection in `lib/ai/limits.ts`.
