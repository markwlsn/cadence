# Levenshtein Typo Tolerance Specification

- Length $\le 3$: Exact match required.
- Length $4–6$: 1 edit distance tolerated.
- Length $\ge 7$: 2 edit distances or $\ge 82\%$ similarity tolerated.
