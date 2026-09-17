import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMasteryQueue, getCramQueue } from '@/lib/fsrs';
import type { ReviewMode } from '@/types';

/**
 * GET /api/review/queue?deckId=&mode=&limit=
 * Returns cards for review based on mode ('mastery' or 'cram').
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');
    const mode = (searchParams.get('mode') ?? 'mastery') as ReviewMode;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (!deckId) {
      return NextResponse.json({ error: 'deckId query parameter is required' }, { status: 400 });
    }

    if (mode !== 'mastery' && mode !== 'cram') {
      return NextResponse.json({ error: "mode must be 'mastery' or 'cram'" }, { status: 400 });
    }

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const cards =
      mode === 'mastery'
        ? await getMasteryQueue(deckId)
        : await getCramQueue(deckId, Number.isNaN(limit) ? 20 : limit);

    return NextResponse.json(cards, { status: 200 });
  } catch (error) {
    console.error('Error in /api/review/queue:', error);
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 });
  }
}
