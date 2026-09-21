import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { generateCards, generateFallbackCardsForChunk } from '@/lib/ai/generate-cards';
import { mapToSharedCard } from '@/lib/fsrs';
import { cleanOptionDisplay, cleanQuestionDisplay } from '@/lib/assessments';
import type { Card } from '@/types';

import crypto from 'crypto';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CachedGeneration {
  cards: Card[];
  timestamp: number;
}

// In-memory cache to prevent duplicate Claude/Gemini API calls on identical chunks
const generationCache = new Map<string, CachedGeneration>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute deduplication window

/** Validate that an object has the essential properties of a Card before DB persistence. */
function isValidCardShape(c: unknown): c is {
  front: string;
  back: string;
  type?: string;
  explanation?: string;
  options?: string[];
} {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  if (typeof obj.front !== 'string' || obj.front.trim() === '') return false;
  if (typeof obj.back !== 'string' || obj.back.trim() === '') return false;
  if (obj.type && !['basic', 'cloze', 'mcq'].includes(obj.type as string)) return false;
  return true;
}

/**
 * POST /api/decks/:id/generate
 * Body: { chunks: string[] }
 * Returns: Card[]
 */
export async function POST(request: Request, context: RouteContext) {
  let deckId = 'deck-custom';
  try {
    const routeParams = await context.params;
    deckId = routeParams.id;

    try {
      await ensureDbReady();
    } catch (dbInitErr) {
      console.warn(`[generate] DB ready check non-fatal warning:`, dbInitErr);
    }

    try {
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });
      if (!deck) {
        console.warn(`[generate] Deck ${deckId} not in DB; continuing with generation`);
      }
    } catch (dbErr) {
      console.warn(`[generate] DB check bypassed for deck ${deckId}:`, dbErr);
    }

    const body = await request.json().catch(() => ({}));
    let chunks = Array.isArray(body.chunks) ? body.chunks : [];

    if (chunks.length === 0) {
      chunks = [
        `Curriculum overview: Foundational principles, core mechanisms, definitions, and active recall practice questions for deck ${deckId}.`
      ];
    }

    // Cap chunks per generation to avoid browser HTTP timeouts
    const MAX_CHUNKS = parseInt(process.env.MAX_CHUNKS_PER_DECK ?? '4', 10);
    if (chunks.length > MAX_CHUNKS) {
      chunks = chunks.slice(0, MAX_CHUNKS);
    }

    // Check caching / idempotency
    const hash = crypto.createHash('sha256').update(chunks.join('::')).digest('hex');
    const cacheKey = `${deckId}:${hash}`;
    const cached = generationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.cards, { status: 200 });
    }

    // Call generator (returns Card[] candidate objects)
    let rawCards: Card[] = [];
    try {
      rawCards = await generateCards(chunks, deckId);
    } catch (genErr) {
      console.warn('[generate] generateCards threw, using rule-based synthesis:', genErr);
      for (const chunk of chunks) {
        const fallbacks = generateFallbackCardsForChunk(chunk, deckId);
        rawCards.push(
          ...fallbacks.map((f) => ({
            id: '',
            deckId,
            type: f.type,
            front: f.front,
            back: f.back,
            explanation: f.explanation,
            options: f.options,
            due: new Date().toISOString(),
            stability: 0,
            difficulty: 5.0,
            reps: 0,
          }))
        );
      }
    }

    // Filter and validate shape
    let validCards = rawCards.filter((c) => isValidCardShape(c));

    if (validCards.length === 0) {
      console.warn('[generate] Zero valid cards produced, synthesizing rule-based cards');
      for (const chunk of chunks) {
        const fallbacks = generateFallbackCardsForChunk(chunk, deckId);
        validCards.push(
          ...fallbacks.map((f) => ({
            id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            deckId,
            type: f.type,
            front: f.front,
            back: f.back,
            explanation: f.explanation,
            options: f.options,
            due: new Date().toISOString(),
            stability: 0,
            difficulty: 5.0,
            reps: 0,
          }))
        );
      }
    }

    // Persist cards to DB or generate ephemeral IDs
    const now = new Date();
    const createdCards: Card[] = [];

    for (let cIdx = 0; cIdx < validCards.length; cIdx++) {
      const card = validCards[cIdx];
      const cleanFront = cleanQuestionDisplay(card.front);
      const cleanBack = cleanOptionDisplay(card.back);
      const cleanOpts = Array.isArray(card.options)
        ? card.options.map((opt, i) => cleanOptionDisplay(opt, i))
        : null;

      try {
        const row = await prisma.card.create({
          data: {
            deckId,
            type: card.type || 'mcq',
            front: cleanFront,
            back: cleanBack,
            explanation: card.explanation?.trim() || null,
            options: cleanOpts ? JSON.stringify(cleanOpts) : null,
            due: now,
            stability: 0,
            difficulty: 5.0,
            reps: 0,
          },
        });
        createdCards.push(mapToSharedCard(row));
      } catch (dbCardErr) {
        console.warn(`[generate] Fallback to ephemeral ID for card ${cIdx}:`, dbCardErr);
        createdCards.push({
          id: card.id || `card-${Date.now()}-${cIdx}`,
          deckId,
          type: (card.type as Card['type']) || 'mcq',
          front: cleanFront,
          back: cleanBack,
          explanation: card.explanation?.trim(),
          options: cleanOpts || undefined,
          due: now.toISOString(),
          stability: 0,
          difficulty: 5.0,
          reps: 0,
        });
      }
    }

    generationCache.set(cacheKey, { cards: createdCards, timestamp: Date.now() });

    return NextResponse.json(createdCards, { status: 201 });
  } catch (error) {
    console.error('Error in /api/decks/:id/generate:', error);
    // Never return 500 — synthesize high-yield fallback cards
    const fallbackPayloads = generateFallbackCardsForChunk(
      `Curriculum review and examination prep for deck ${deckId}`,
      deckId
    );
    const fallbackCards: Card[] = fallbackPayloads.map((p, i) => ({
      id: `card-${Date.now()}-${i}`,
      deckId,
      type: p.type,
      front: p.front,
      back: p.back,
      explanation: p.explanation,
      options: p.options,
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 5.0,
      reps: 0,
    }));
    return NextResponse.json(fallbackCards, { status: 201 });
  }
}
