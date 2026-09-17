/**
 * /lib/data.ts — Data Access Layer
 *
 * THE SEAM between frontend and API.
 *
 * Phase 4: Swapped to real fetch() calls against backend API routes.
 * Gated mock fallback only when NODE_ENV === 'development' && USE_MOCKS === 'true'.
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

// ─── Environment & Base URL Resolution ─────────────────────────────────────────

const USE_MOCKS =
  process.env.NODE_ENV === 'development' && process.env.USE_MOCKS === 'true';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

// ─── Local Review Sessions (Client Memory) ────────────────────────────────────

const activeSessions: Map<string, ReviewSession> = new Map();

// ─── Lazy Mock Loaders (Gated) ────────────────────────────────────────────────

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
  if (USE_MOCKS) {
    return getMockDecks();
  }

  const res = await fetch(`${getBaseUrl()}/api/decks`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch decks: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch a single deck by ID. Returns null if not found.
 * Corresponds to GET /api/decks/:id
 */
export async function getDeck(id: string): Promise<Deck | null> {
  if (USE_MOCKS) {
    const decks = await getMockDecks();
    return decks.find((d) => d.id === id) ?? null;
  }

  const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch deck ${id}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch aggregated stats for a deck.
 * Corresponds to GET /api/decks/:id/stats
 */
export async function getDeckStats(deckId: string): Promise<DeckStats> {
  if (USE_MOCKS) {
    const stats = await getMockStats();
    return (
      stats[deckId] ?? {
        deckId,
        totalCards: 0,
        dueNow: 0,
        masteredCount: 0,
        accuracyLast7Days: 0,
      }
    );
  }

  const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}/stats`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return {
      deckId,
      totalCards: 0,
      dueNow: 0,
      masteredCount: 0,
      accuracyLast7Days: 0,
    };
  }

  return res.json();
}

/**
 * Fetch cards in a deck.
 * Corresponds to GET /api/decks/:id/cards
 */
export async function getDeckCards(deckId: string): Promise<Card[]> {
  if (USE_MOCKS) {
    const cards = await getMockCards();
    return cards.filter((c) => c.deckId === deckId);
  }

  const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}/cards`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch cards for deck ${deckId}: ${res.statusText}`);
  }

  return res.json();
}

// ─── Review / Queue Functions ─────────────────────────────────────────────────

/**
 * Fetch the review queue for a deck and mode.
 * Corresponds to GET /api/review/queue?deckId=&mode=
 */
export async function getQueue(deckId: string, mode: ReviewMode): Promise<Card[]> {
  if (USE_MOCKS) {
    const cards = await getMockCards();
    const deckCards = cards.filter((c) => c.deckId === deckId);

    if (mode === 'mastery') {
      const now = new Date().toISOString();
      return deckCards
        .filter((c) => c.due <= now)
        .sort((a, b) => a.due.localeCompare(b.due));
    }

    return [...deckCards].sort(() => Math.random() - 0.5);
  }

  const url = `${getBaseUrl()}/api/review/queue?deckId=${encodeURIComponent(
    deckId
  )}&mode=${encodeURIComponent(mode)}`;

  const res = await fetch(url, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch review queue: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Submit a card review rating.
 * Corresponds to POST /api/review/submit
 */
export async function submitReview(payload: {
  cardId: string;
  rating: Rating;
  confidenceBefore?: 1 | 2 | 3 | 4 | 5;
}): Promise<Card> {
  if (USE_MOCKS) {
    const cards = await getMockCards();
    const card = cards.find((c) => c.id === payload.cardId);

    if (!card) {
      throw new Error(`Card not found: ${payload.cardId}`);
    }

    return {
      ...card,
      lastReviewed: new Date().toISOString(),
      reps: card.reps + 1,
    };
  }

  const res = await fetch(`${getBaseUrl()}/api/review/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Failed to submit review: ${res.statusText}`);
  }

  return res.json();
}

// ─── Session Management (Client helper) ───────────────────────────────────────

/**
 * Start or initialize a local review session tracking log.
 */
export async function createSession(deckId: string, mode: ReviewMode): Promise<string> {
  const sessionId = `session-${Date.now()}`;
  const session: ReviewSession = {
    id: sessionId,
    deckId,
    mode,
    startedAt: new Date().toISOString(),
    log: [],
  };
  activeSessions.set(sessionId, session);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`cadence_session_${sessionId}`, JSON.stringify(session));
    } catch {}
  }
  return sessionId;
}

/**
 * Record a rating in the active session log.
 */
export async function recordSessionLog(
  sessionId: string,
  entry: ReviewLogEntry
): Promise<void> {
  let session = activeSessions.get(sessionId);
  if (!session && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`cadence_session_${sessionId}`);
      if (stored) session = JSON.parse(stored);
    } catch {}
  }
  if (session) {
    session.log.push(entry);
    activeSessions.set(sessionId, session);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`cadence_session_${sessionId}`, JSON.stringify(session));
      } catch {}
    }
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
  let session = activeSessions.get(sessionId);
  if (!session && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`cadence_session_${sessionId}`);
      if (stored) session = JSON.parse(stored);
    } catch {}
  }

  const total = session ? session.log.length : 0;
  const goodOrEasy = session
    ? session.log.filter((e) => e.rating === 'good' || e.rating === 'easy').length
    : 0;

  if (session && !session.completedAt) {
    session.completedAt = new Date().toISOString();
    activeSessions.set(sessionId, session);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`cadence_session_${sessionId}`, JSON.stringify(session));
      } catch {}
    }
  }

  // Calculate real streak from client storage if available
  let streak = 1;
  if (typeof window !== 'undefined') {
    try {
      const storedStreak = parseInt(localStorage.getItem('cadence_user_streak') || '1', 10);
      streak = Math.max(1, isNaN(storedStreak) ? 1 : storedStreak);
    } catch {}
  }

  return {
    sessionId,
    deckId: session ? session.deckId : '',
    mode: session ? session.mode : 'mastery',
    cardsReviewed: total,
    accuracy: total > 0 ? Number((goodOrEasy / total).toFixed(4)) : 0,
    streak,
    dueNext: new Date(Date.now() + 86400000).toISOString(),
  };
}

// ─── Deck Creation & Ingestion ────────────────────────────────────────────────

/**
 * Create a new deck, ingest content, and generate flashcards.
 */
export async function createDeck(params: {
  title: string;
  sourceType: 'pdf' | 'text' | 'image';
  rawContent?: string;
  file?: File;
}): Promise<{ deck: Deck; cards: Card[] }> {
  if (USE_MOCKS) {
    const mockDecks = await getMockDecks();
    const mockCards = await getMockCards();

    const newDeckId = `deck-${Date.now()}`;
    const newDeck: Deck = {
      id: newDeckId,
      title: params.title || 'Untitled Deck',
      sourceType: params.sourceType,
      createdAt: new Date().toISOString(),
    };

    mockDecks.push(newDeck);
    return { deck: newDeck, cards: mockCards.slice(0, 4) };
  }

  // 1. Create the deck record
  const createRes = await fetch(`${getBaseUrl()}/api/decks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: params.title,
      sourceType: params.sourceType,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create deck');
  }

  const deck: Deck = await createRes.json();

  // 2. Ingest content if provided
  let chunks: string[] = [];

  if (params.file) {
    const formData = new FormData();
    formData.append('file', params.file);
    const ingestRes = await fetch(
      `${getBaseUrl()}/api/decks/${encodeURIComponent(deck.id)}/ingest`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (ingestRes.ok) {
      const ingestData = await ingestRes.json();
      chunks = ingestData.chunks || [];
    } else {
      console.warn('File ingestion failed:', await ingestRes.text());
    }
  } else if (params.rawContent && params.rawContent.trim()) {
    const ingestRes = await fetch(
      `${getBaseUrl()}/api/decks/${encodeURIComponent(deck.id)}/ingest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: params.rawContent.trim() }),
      }
    );

    if (ingestRes.ok) {
      const ingestData = await ingestRes.json();
      chunks = ingestData.chunks || [];
    } else {
      console.warn('Text ingestion failed:', await ingestRes.text());
    }
  }

  // 3. Generate cards if chunks were extracted
  let cards: Card[] = [];
  if (chunks.length > 0) {
    const generateRes = await fetch(
      `${getBaseUrl()}/api/decks/${encodeURIComponent(deck.id)}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunks }),
      }
    );

    if (generateRes.ok) {
      cards = await generateRes.json();
    } else {
      const err = await generateRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate flashcards from source material');
    }
  }

  return { deck, cards };
}
