import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCards } from '@/lib/ai/generate-cards';
import { mapToSharedCard } from '@/lib/fsrs';
import type { Card } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
  try {
    const { id: deckId } = await context.params;

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const chunks = Array.isArray(body.chunks) ? body.chunks : [];

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'chunks array is required' }, { status: 400 });
    }

    // Call generator (returns Card[] candidate objects)
    const rawCards = await generateCards(chunks, deckId);

    // Filter and validate shape before persisting (Constitution non-negotiable)
    const validCards = rawCards.filter((c) => {
      const valid = isValidCardShape(c);
      if (!valid) {
        console.warn(`[generate] Skipping malformed card for deck ${deckId}:`, c);
      }
      return valid;
    });

    if (validCards.length === 0) {
      return NextResponse.json({ error: 'No valid cards could be generated from chunks' }, { status: 422 });
    }

    // Persist cards to DB
    const now = new Date();
    const createdCards: Card[] = [];

    for (const card of validCards) {
      const row = await prisma.card.create({
        data: {
          deckId,
          type: card.type || 'basic',
          front: card.front.trim(),
          back: card.back.trim(),
          explanation: card.explanation?.trim() || null,
          options: Array.isArray(card.options) ? JSON.stringify(card.options) : null,
          due: now,
          stability: 0,
          difficulty: 5.0,
          reps: 0,
        },
      });
      createdCards.push(mapToSharedCard(row));
    }

    return NextResponse.json(createdCards, { status: 201 });
  } catch (error) {
    console.error('Error in /api/decks/:id/generate:', error);
    return NextResponse.json({ error: 'Failed to generate cards' }, { status: 500 });
  }
}
