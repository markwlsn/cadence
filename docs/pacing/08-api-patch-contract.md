# API Specification: PATCH /api/decks/:id
**Endpoint**: `PATCH /api/decks/:id`  
**Payload**:
```json
{
  "examDate": "2026-11-20"
}
```
**Response (200 OK)**: Full `Deck` object with updated `examDate` in ISO string format.  
**Errors**:
- 400 Bad Request: Invalid date format, past date, or >3 years in future.
- 403 Forbidden: Deck claimed by another registered user.
- 404 Not Found: Deck does not exist.
