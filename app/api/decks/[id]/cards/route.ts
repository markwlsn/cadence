import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { mapToSharedCard } from '@/lib/fsrs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/decks/:id/cards
 * Returns all cards for a deck.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureDbReady();
    const { id: deckId } = await context.params;

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const cards = await prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(cards.map(mapToSharedCard), { status: 200 });
  } catch (error) {
    console.error('Error in /api/decks/:id/cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
