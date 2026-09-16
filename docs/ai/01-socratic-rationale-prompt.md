# Socratic Rationale Prompt Specification

Endpoint: `POST /api/review/explain`

## Structured Schema
```json
{
  "misconception": "Explanation of the cognitive trap in the chosen distractor.",
  "correctPrinciple": "Causal mechanism of the correct answer.",
  "keyTakeaway": "Single active-recall anchor sentence."
}
```
