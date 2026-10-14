# UTC Midnight Storage Specification
**Pattern**: When a student picks a calendar date (e.g. `2026-10-24`), store the timestamp normalized to UTC midnight (`2026-10-24T00:00:00.000Z`).  
**Benefit**: Prevents daylight saving and cross-meridian drift during serialization between browser date pickers and server SQLite timestamps.
