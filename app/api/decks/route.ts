import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Deck } from '@/types';

function mapDeck(d: { id: string; title: string; sourceType: string; createdAt: Date }): Deck {
  return {
    id: d.id,
    title: d.title,
    sourceType: d.sourceType as Deck['sourceType'],
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * GET /api/decks
 * Returns list of all decks.
 */
export async function GET() {
  try {
    const decks = await prisma.deck.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(decks.map(mapDeck));
  } catch (error) {
    console.error('Error fetching decks:', error);
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 });
  }
}

/**
 * POST /api/decks
 * Body: { title: string, sourceType?: 'pdf' | 'text' | 'image' }
 * Returns created Deck with status 201.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const title = body.title.trim();
    const allowedTypes = ['pdf', 'text', 'image'];
    const sourceType = allowedTypes.includes(body.sourceType) ? body.sourceType : 'text';

    const deck = await prisma.deck.create({
      data: {
        title,
        sourceType,
      },
    });

    return NextResponse.json(mapDeck(deck), { status: 201 });
  } catch (error) {
    console.error('Error creating deck:', error);
    return NextResponse.json({ error: 'Failed to create deck' }, { status: 500 });
  }
}
