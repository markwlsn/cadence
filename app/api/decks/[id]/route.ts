import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Deck } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapDeck(d: { id: string; title: string; sourceType: string; createdAt: Date }): Deck {
  return {
    id: d.id,
    title: d.title,
    sourceType: d.sourceType as Deck['sourceType'],
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * GET /api/decks/:id
 * Returns a single deck by ID.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const deck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    return NextResponse.json(mapDeck(deck), { status: 200 });
  } catch (error) {
    console.error('Error fetching deck:', error);
    return NextResponse.json({ error: 'Failed to fetch deck' }, { status: 500 });
  }
}
