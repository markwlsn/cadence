import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MASTERY_STABILITY_DAYS } from '@/lib/fsrs';
import type { DeckStats } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/decks/:id/stats
 * Computes and returns DeckStats:
 * - totalCards
 * - dueNow (due <= now)
 * - masteredCount (stability >= MASTERY_STABILITY_DAYS)
 * - accuracyLast7Days (good + easy ratings / total ratings in last 7 days)
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: deckId } = await context.params;

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalCards, dueNow, masteredCount, recentLogs] = await Promise.all([
      // Total cards in deck
      prisma.card.count({
        where: { deckId },
      }),
      // Cards due now or overdue
      prisma.card.count({
        where: {
          deckId,
          due: { lte: now },
        },
      }),
      // Cards considered mastered (stability >= 21 days)
      prisma.card.count({
        where: {
          deckId,
          stability: { gte: MASTERY_STABILITY_DAYS },
        },
      }),
      // Review logs from the last 7 days
      prisma.reviewLogEntry.findMany({
        where: {
          deckId,
          reviewedAt: { gte: sevenDaysAgo },
        },
        select: {
          rating: true,
        },
      }),
    ]);

    const totalReviews = recentLogs.length;
    const successfulReviews = recentLogs.filter(
      (log) => log.rating === 'good' || log.rating === 'easy'
    ).length;

    const accuracyLast7Days =
      totalReviews > 0 ? Number((successfulReviews / totalReviews).toFixed(4)) : 0;

    const stats: DeckStats = {
      deckId,
      totalCards,
      dueNow,
      masteredCount,
      accuracyLast7Days,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('Error in /api/decks/:id/stats:', error);
    return NextResponse.json({ error: 'Failed to fetch deck stats' }, { status: 500 });
  }
}
