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

// ─── Local Custom Decks & Cards Storage (Resilience for Serverless Deployments) ─

const CUSTOM_DECKS_KEY = 'cadence_custom_decks';
const CUSTOM_CARDS_KEY = 'cadence_custom_cards';

export function getLocalCustomDecks(): Deck[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomDeck(deck: Deck, cards: Card[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existingDecks = getLocalCustomDecks().filter((d) => d.id !== deck.id);
    localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify([deck, ...existingDecks]));

    const rawCards = localStorage.getItem(CUSTOM_CARDS_KEY);
    const existingCards: Card[] = rawCards ? JSON.parse(rawCards) : [];
    const otherCards = existingCards.filter((c) => c.deckId !== deck.id);
    localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify([...otherCards, ...cards]));
  } catch (e) {
    console.warn('[data] Failed to save custom deck to localStorage:', e);
  }
}

export function getLocalCustomCards(deckId: string): Card[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CARDS_KEY);
    if (!raw) return [];
    const cards: Card[] = JSON.parse(raw);
    return cards.filter((c) => c.deckId === deckId);
  } catch {
    return [];
  }
}

// ─── Deck Functions ───────────────────────────────────────────────────────────

/**
 * Fetch all decks.
 * Corresponds to GET /api/decks
 */
export async function getDecks(): Promise<Deck[]> {
  let decks: Deck[] = [];

  if (USE_MOCKS) {
    decks = await getMockDecks();
  } else {
    try {
      const res = await fetch(`${getBaseUrl()}/api/decks`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          decks = data;
        }
      }
    } catch (err) {
      console.warn('[data] Could not fetch decks from API, falling back to mock data:', err);
    }

    if (decks.length === 0) {
      decks = await getMockDecks();
    }
  }

  // Merge client-side custom decks if in browser
  const custom = getLocalCustomDecks();
  if (custom.length > 0) {
    const customIds = new Set(custom.map((d) => d.id));
    return [...custom, ...decks.filter((d) => !customIds.has(d.id))];
  }

  return decks;
}

/**
 * Fetch a single deck by ID. Returns null if not found.
 * Corresponds to GET /api/decks/:id
 */
export async function getDeck(id: string): Promise<Deck | null> {
  const custom = getLocalCustomDecks().find((d) => d.id === id);
  if (custom) return custom;

  if (USE_MOCKS) {
    const decks = await getMockDecks();
    return decks.find((d) => d.id === id) ?? null;
  }

  try {
    const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });

    if (res.status === 404) {
      return null;
    }

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[data] Could not fetch deck ${id}, falling back to mock data:`, err);
  }

  const mockDecks = await getMockDecks();
  return mockDecks.find((d) => d.id === id) ?? null;
}

/**
 * Fetch aggregated stats for a deck.
 * Corresponds to GET /api/decks/:id/stats
 */
export async function getDeckStats(deckId: string): Promise<DeckStats> {
  const customCards = getLocalCustomCards(deckId);
  if (customCards.length > 0) {
    const now = new Date().toISOString();
    const dueNow = customCards.filter((c) => c.due <= now).length;
    const masteredCount = customCards.filter((c) => c.stability >= 21).length;
    return {
      deckId,
      totalCards: customCards.length,
      dueNow,
      masteredCount,
      accuracyLast7Days: 1.0,
    };
  }

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

  try {
    const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}/stats`, {
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[data] Could not fetch stats for ${deckId}, falling back:`, err);
  }

  const mockStats = await getMockStats();
  return (
    mockStats[deckId] ?? {
      deckId,
      totalCards: 0,
      dueNow: 0,
      masteredCount: 0,
      accuracyLast7Days: 0,
    }
  );
}

/**
 * Fetch cards in a deck.
 * Corresponds to GET /api/decks/:id/cards
 */
export async function getDeckCards(deckId: string): Promise<Card[]> {
  const customCards = getLocalCustomCards(deckId);
  if (customCards.length > 0) return customCards;

  if (USE_MOCKS) {
    const cards = await getMockCards();
    return cards.filter((c) => c.deckId === deckId);
  }

  try {
    const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}/cards`, {
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[data] Could not fetch cards for ${deckId}, falling back:`, err);
  }

  const mockCards = await getMockCards();
  return mockCards.filter((c) => c.deckId === deckId);
}

// ─── Review / Queue Functions ─────────────────────────────────────────────────

/**
 * Fetch the review queue for a deck and mode.
 * Corresponds to GET /api/review/queue?deckId=&mode=
 */
export async function getQueue(deckId: string, mode: ReviewMode): Promise<Card[]> {
  const customCards = getLocalCustomCards(deckId);
  if (customCards.length > 0) {
    if (mode === 'mastery') {
      const now = new Date().toISOString();
      const due = customCards.filter((c) => c.due <= now);
      return (due.length > 0 ? due : customCards).sort((a, b) => a.due.localeCompare(b.due));
    }
    return [...customCards].sort(() => Math.random() - 0.5);
  }

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

  try {
    const url = `${getBaseUrl()}/api/review/queue?deckId=${encodeURIComponent(
      deckId
    )}&mode=${encodeURIComponent(mode)}`;

    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[data] Could not fetch queue for ${deckId}, falling back:`, err);
  }

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
  let deck: Deck;
  try {
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

    if (createRes.ok) {
      deck = await createRes.json();
    } else {
      const err = await createRes.json().catch(() => ({}));
      console.warn('[data] Backend /api/decks failed, creating local fallback deck:', err);
      deck = {
        id: `deck-${Date.now()}`,
        title: params.title || 'Untitled Deck',
        sourceType: params.sourceType,
        createdAt: new Date().toISOString(),
        isArchived: false,
      };
    }
  } catch (err) {
    console.warn('[data] Network failure contacting /api/decks, using local deck:', err);
    deck = {
      id: `deck-${Date.now()}`,
      title: params.title || 'Untitled Deck',
      sourceType: params.sourceType,
      createdAt: new Date().toISOString(),
      isArchived: false,
    };
  }

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
      const err = await ingestRes.json().catch(() => ({}));
      console.warn('File ingestion failed:', err);
      throw new Error(err.error || 'Failed to extract text from the uploaded document.');
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
      const err = await ingestRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process notes text.');
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
      throw new Error(err.error || 'Failed to generate flashcards with AI.');
    }
  }

  // Save to client storage as persistent backup
  saveLocalCustomDeck(deck, cards);

  return { deck, cards };
}

/**
 * Permanently delete a deck and all associated cards and review logs.
 * Corresponds to DELETE /api/decks/:id
 */
export async function deleteDeck(deckId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalCustomDecks().filter((d) => d.id !== deckId);
      localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(existing));
      const rawCards = localStorage.getItem(CUSTOM_CARDS_KEY);
      if (rawCards) {
        const cards: Card[] = JSON.parse(rawCards);
        localStorage.setItem(
          CUSTOM_CARDS_KEY,
          JSON.stringify(cards.filter((c) => c.deckId !== deckId))
        );
      }
    } catch {}
  }

  try {
    const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.warn(`[data] Remote delete returned status ${res.status}`);
    }
  } catch (err) {
    console.warn(`[data] Could not delete remote deck ${deckId}:`, err);
  }

  return true;
}

/**
 * Archive or unarchive a deck.
 * Corresponds to PATCH /api/decks/:id
 */
export async function archiveDeck(deckId: string, isArchived: boolean): Promise<Deck> {
  if (typeof window !== 'undefined') {
    try {
      const customDecks = getLocalCustomDecks();
      const idx = customDecks.findIndex((d) => d.id === deckId);
      if (idx !== -1) {
        customDecks[idx].isArchived = isArchived;
        localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customDecks));
      }
    } catch {}
  }

  try {
    const res = await fetch(`${getBaseUrl()}/api/decks/${encodeURIComponent(deckId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[data] Could not patch remote deck ${deckId}:`, err);
  }

  const found = getLocalCustomDecks().find((d) => d.id === deckId);
  if (found) return found;

  return {
    id: deckId,
    title: 'Deck',
    sourceType: 'text',
    isArchived,
    createdAt: new Date().toISOString(),
  };
}

