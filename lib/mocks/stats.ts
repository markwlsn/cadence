import type { DeckStats } from '@/types';

export const mockStats: Record<string, DeckStats> = {
  'deck-001': {
    deckId: 'deck-001',
    totalCards: 9,
    dueNow: 3,    // cards-001, 002, 007 are overdue
    masteredCount: 2, // cards with reps >= 8 (card-008)
    accuracyLast7Days: 0.72,
  },
  'deck-002': {
    deckId: 'deck-002',
    totalCards: 8,
    dueNow: 4,    // cards-010, 011, 012, 013, 016 (4 overdue + 2 due today)
    masteredCount: 1, // card-017
    accuracyLast7Days: 0.65,
  },
};
