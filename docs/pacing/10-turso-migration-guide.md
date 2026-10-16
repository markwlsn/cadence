# Turso Production Database Migration Runbook
For remote libSQL databases:
```bash
turso db shell <production-db-name> < docs/db/add-deck-exam-date.sql
```
Or execute directly in the Turso Web Console:
```sql
ALTER TABLE "Deck" ADD COLUMN "examDate" DATETIME;
```
The operation runs in <50ms and preserves all existing rows with NULL.
