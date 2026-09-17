/**
 * /lib/data.ts — Data Access Layer
 *
 * THE SEAM between frontend and API.
 *
 * Phase 1: All functions read from /lib/mocks/ and simulate async latency.
 * Phase 4: Swap function bodies to fetch() calls. Signatures stay identical.
 *
 * Rules:
 *   - All functions are async (return Promise<T>).
 *   - Function signatures must match the Phase 0 API contract table.
 *   - Components MUST NOT import /lib/mocks/ directly — only this file.
 */

import type {
  Deck,
  Card,
  DeckStats,
  ReviewSession,
  ReviewLogEntry,
  ReviewMode,
  Rating,
} from '@/types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Simulate realistic network latency */
function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** In-memory review sessions for tracking local state during review */
const activeSessions: Map<string, ReviewSession> = new Map();

// Lazy-load mocks
async function getMockDecks() {
  const { mockDecks } = await import('./mocks/decks');
  return mockDecks;
}

async function getMockCards() {
  const { mockCards } = await import('./mocks/cards');
  return mockCards;
}

async function getMockStats() {
  const { mockStats } = await import('./mocks/stats');
  return mockStats;
}

// ─── Deck Functions ───────────────────────────────────────────────────────────

/**
 * Fetch all decks.
 * Corresponds to GET /api/decks
 */
export async function getDecks(): Promise<Deck[]> {
  await delay();
  return getMockDecks();
}

/**
 * Fetch a single deck by ID. Returns null if not found.
 * Corresponds to GET /api/decks/:id
 */
export async function getDeck(id: string): Promise<Deck | null> {
  await delay();
  const decks = await getMockDecks();
  return decks.find((d) => d.id === id) ?? null;
}

/**
 * Fetch aggregated stats for a deck.
 * Corresponds to GET /api/decks/:id/stats
 */
export async function getDeckStats(deckId: string): Promise<DeckStats> {
  await delay();
  const stats = await getMockStats();
  const found = stats[deckId];
  if (!found) {
    return {
      deckId,
      totalCards: 0,
      dueNow: 0,
      masteredCount: 0,
      accuracyLast7Days: 0,
    };
  }
  return found;
}

/**
 * Fetch cards in a deck.
 * Corresponds to GET /api/decks/:id/cards
 */
export async function getDeckCards(deckId: string): Promise<Card[]> {
  await delay();
  const cards = await getMockCards();
  return cards.filter((c) => c.deckId === deckId);
}

// ─── Review / Queue Functions ─────────────────────────────────────────────────

/**
 * Fetch the review queue for a deck and mode.
 * Corresponds to GET /api/review/queue?deckId=&mode=
 *
 * - 'mastery' mode: returns cards due now or overdue, sorted by due date.
 * - 'cram' mode: returns cards regardless of due date.
 */
export async function getQueue(deckId: string, mode: ReviewMode): Promise<Card[]> {
  await delay();
  const cards = await getMockCards();
  const deckCards = cards.filter((c) => c.deckId === deckId);

  if (mode === 'mastery') {
    const now = new Date().toISOString();
    return deckCards
      .filter((c) => c.due <= now)
      .sort((a, b) => a.due.localeCompare(b.due));
  }

  // Cram mode: returns all cards in deck
  return [...deckCards].sort(() => Math.random() - 0.5);
}

/**
 * Submit a card review rating.
 * Corresponds to POST /api/review/submit
 * Body: { cardId, rating, confidenceBefore }
 * Returns: updated Card
 */
export async function submitReview(payload: {
  cardId: string;
  rating: Rating;
  confidenceBefore?: 1 | 2 | 3 | 4 | 5;
}): Promise<Card> {
  await delay(60);
  const cards = await getMockCards();
  const card = cards.find((c) => c.id === payload.cardId);

  if (!card) {
    throw new Error(`Card not found: ${payload.cardId}`);
  }

  // Simulate card update
  const updatedCard: Card = {
    ...card,
    lastReviewed: new Date().toISOString(),
    reps: card.reps + 1,
  };

  return updatedCard;
}

// ─── Session Management (Client helper) ───────────────────────────────────────

/**
 * Start or initialize a local review session tracking log.
 */
export async function createSession(deckId: string, mode: ReviewMode): Promise<string> {
  await delay(20);
  const sessionId = `session-${Date.now()}`;
  const session: ReviewSession = {
    id: sessionId,
    deckId,
    mode,
    startedAt: new Date().toISOString(),
    log: [],
  };
  activeSessions.set(sessionId, session);
  return sessionId;
}

/**
 * Record a rating in the active session log.
 */
export async function recordSessionLog(
  sessionId: string,
  entry: ReviewLogEntry
): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.log.push(entry);
  }
}

/**
 * Complete a session and calculate summary stats.
 */
export async function completeSession(sessionId: string): Promise<{
  sessionId: string;
  deckId: string;
  mode: ReviewMode;
  cardsReviewed: number;
  accuracy: number;
  streak: number;
  dueNext: string;
}> {
  await delay(80);
  const session = activeSessions.get(sessionId);
  const total = session ? session.log.length : 0;
  const goodOrEasy = session
    ? session.log.filter((e) => e.rating === 'good' || e.rating === 'easy').length
    : 0;

  if (session && !session.completedAt) {
    session.completedAt = new Date().toISOString();
  }

  return {
    sessionId,
    deckId: session ? session.deckId : '',
    mode: session ? session.mode : 'mastery',
    cardsReviewed: total,
    accuracy: total > 0 ? goodOrEasy / total : 1,
    streak: 4, // Realistic mock streak
    dueNext: new Date(Date.now() + 86400000).toISOString(),
  };
}

// ─── Deck Creation & Ingestion ────────────────────────────────────────────────

/**
 * Create a new deck.
 * Corresponds to POST /api/decks
 * Body: { title, sourceType }
 */
export async function createDeck(params: {
  title: string;
  sourceType: 'pdf' | 'text' | 'image';
  rawContent?: string;
}): Promise<{ deck: Deck; cards: Card[] }> {
  // Simulate end-to-end ingest & card generation delay (2 seconds)
  await delay(2000);

  const mockDecks = await getMockDecks();
  const mockCards = await getMockCards();

  const newDeckId = `deck-${Date.now()}`;
  const newDeck: Deck = {
    id: newDeckId,
    title: params.title || 'Untitled Deck',
    sourceType: params.sourceType,
    createdAt: new Date().toISOString(),
  };

  // Add to in-memory mocks
  mockDecks.push(newDeck);

  // Generate 4 mock cards for this newly created deck
  const newCards: Card[] = [
    {
      id: `card-${Date.now()}-1`,
      deckId: newDeckId,
      type: 'basic',
      front: `Key Concept 1 from ${newDeck.title}`,
      back: 'The fundamental definition and principles.',
      explanation: 'Extracted automatically from your source material.',
      due: new Date().toISOString(),
      stability: 1.0,
      difficulty: 0.3,
      reps: 0,
    },
    {
      id: `card-${Date.now()}-2`,
      deckId: newDeckId,
      type: 'cloze',
      front: `The {{c1::primary mechanism}} is responsible for driving this process.`,
      back: 'The primary mechanism is responsible for driving this process.',
      explanation: 'Crucial core concept from the imported notes.',
      due: new Date().toISOString(),
      stability: 1.0,
      difficulty: 0.3,
      reps: 0,
    },
    {
      id: `card-${Date.now()}-3`,
      deckId: newDeckId,
      type: 'mcq',
      front: 'Which of the following best describes the core outcome?',
      back: 'Systematic reinforcement',
      explanation: 'Identified as a critical distinction during analysis.',
      options: ['Systematic reinforcement', 'Linear degradation', 'Random fluctuation', 'Static equilibrium'],
      due: new Date().toISOString(),
      stability: 1.0,
      difficulty: 0.4,
      reps: 0,
    },
  ];

  mockCards.push(...newCards);

  // Add stats entry
  const stats = await getMockStats();
  stats[newDeckId] = {
    deckId: newDeckId,
    totalCards: newCards.length,
    dueNow: newCards.length,
    masteredCount: 0,
    accuracyLast7Days: 0,
  };

  return { deck: newDeck, cards: newCards };
}
