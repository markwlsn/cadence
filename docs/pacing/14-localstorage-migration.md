# One-Time LocalStorage Migration Protocol
To transition users from purely local browser storage to persistent cross-device SQLite storage:
- Key: `cadence_exam_date_${deckId}`
- Migration fires on deck mount if server `examDate` is null.
- Upon successful PATCH response, `localStorage.removeItem` is called.
- Fully backwards compatible for existing active sessions.
