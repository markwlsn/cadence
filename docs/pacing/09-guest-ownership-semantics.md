# Guest Deck Ownership Semantics
Decks with `userId: "guest"` or `userId: null` are public starter decks.  
In `app/api/decks/[id]/route.ts`:
- When `rawDeck.userId === 'guest'`, ownership rejection (403) is bypassed.
- Any guest or authenticated session can set exam dates or customize pacing on demo decks.
