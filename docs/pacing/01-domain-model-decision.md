# Architecture Decision Record: Deck-Level Exam Date Pacing
**Status**: Accepted  
**Context**: Students prepare for multiple academic examinations concurrently across distinct courses (e.g. Biology, Organic Chemistry, Anatomy).  
**Decision**: Store `examDate DateTime?` on the `Deck` entity rather than the global `User` entity.  
**Consequences**: Each deck independently calculates its countdown, unmastered cards pacing, and daily study targets without cross-course interference.
