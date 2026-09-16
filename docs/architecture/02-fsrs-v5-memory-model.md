# FSRS v5 Spaced Repetition Scheduling Engine

Cadence integrates ts-fsrs implementing the Free Spaced Repetition Scheduler algorithm.

## Mathematical Formulation
- **Stability ($S$)**: Time (in days) for retention probability to decay from 100% to 90%.
- **Difficulty ($D$)**: Inherent complexity of the card on a 1–10 scale.
- **Retrievability ($R$)**: Projected recall probability at time $t$:
  $$R(t) = (1 + \text{factor} \cdot t / S)^{-1}$$
