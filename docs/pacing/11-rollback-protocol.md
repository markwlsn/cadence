# Database Rollback Protocol
If rollbacks are required:
1. **SQLite 3.35.0+ / Turso**:
   ```sql
   ALTER TABLE "Deck" DROP COLUMN "examDate";
   ```
2. **Code Rollback**:
   Revert to previous commit on main; frontend gracefully falls back to local storage pacing.
