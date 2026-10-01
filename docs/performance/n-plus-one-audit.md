# SSR N+1 Query Bottleneck Audit
Analysis of Promise.all(decks.map(getDeckStats)) firing 40+ database queries on page hit.
