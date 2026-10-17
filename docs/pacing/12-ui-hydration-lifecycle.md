# DeckDetailClient Hydration Lifecycle
1. Initial state initializes with `deck.examDate.split('T')[0]` if present.
2. In `useEffect`: checks server date vs `localStorage`.
3. If server has a date, it takes precedence and removes legacy client key.
4. If server has null but client has key, it executes background PATCH migration.
