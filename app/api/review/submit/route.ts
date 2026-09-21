import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { scheduleAndPersistCard } from '@/lib/fsrs';
import type { Rating } from '@/types';

const VALID_RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

/**
 * POST /api/review/submit
 * Body: { cardId: string, rating: Rating, confidenceBefore?: 1 | 2 | 3 | 4 | 5 }
 * Returns: updated Card
 */
export async function POST(request: Request) {
  try {
    await ensureDbReady();
    const body = await request.json().catch(() => ({}));
    const { cardId, rating, confidenceBefore } = body;

    if (!cardId || typeof cardId !== 'string') {
      return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
    }

    if (!rating || !VALID_RATINGS.includes(rating as Rating)) {
      return NextResponse.json(
        { error: `rating must be one of: ${VALID_RATINGS.join(', ')}` },
        { status: 400 }
      );
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const conf =
      typeof confidenceBefore === 'number' && confidenceBefore >= 1 && confidenceBefore <= 5
        ? Math.round(confidenceBefore)
        : undefined;

    const updatedCard = await scheduleAndPersistCard(cardId, rating as Rating, conf);

    return NextResponse.json(updatedCard, { status: 200 });
  } catch (error) {
    console.error('Error in /api/review/submit:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
