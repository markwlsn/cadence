---
trigger: always_on
---

# Cadence Conventions

- **Stack**: Next.js 16 App Router, React 19, Tailwind v4, Prisma 6.19 + @libsql/client, ts-fsrs v5, Anthropic + Gemini dual provider.
- Never remove or bypass the double-submit mutex on review submissions.
- Never modify the Prisma schema without a migration and an explanation.
- No new dependencies unless necessary.
- Always run unit and regression tests before and after changes.
- One feature per branch named `feat/<feature-name>`.
- Never expand scope beyond the spec.
