-- Migration: Add nullable examDate column to Deck
-- Target: SQLite / Turso libSQL
-- Invariant: Existing rows remain valid with NULL examDate

ALTER TABLE "Deck" ADD COLUMN "examDate" DATETIME;

-- ============================================================================
-- HOW TO RUN ON PRODUCTION:
-- ============================================================================
-- Option 1 (Turso libSQL with Turso CLI):
--   turso db shell <your-db-name> < docs/db/add-deck-exam-date.sql
--
-- Option 2 (Turso Web Console):
--   Open your database in https://turso.tech/app, paste the SQL query above,
--   and click "Run".
--
-- Option 3 (Prisma db push against remote production URL):
--   DATABASE_URL="<production-url>" TURSO_AUTH_TOKEN="<token>" npx prisma db push
--
-- Option 4 (Self-hosted SQLite / VPS):
--   sqlite3 /path/to/production.db < docs/db/add-deck-exam-date.sql
-- ============================================================================
