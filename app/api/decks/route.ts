import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { Deck } from '@/types';

const creationMutexes = new Map<string, Promise<void>>();

function mapDeck(d: {
  id: string;
  userId?: string | null;
  title: string;
  sourceType: string;
  isArchived?: boolean;
  createdAt: Date;
}): Deck {
  return {
    id: d.id,
    userId: d.userId ?? undefined,
    title: d.title,
    sourceType: d.sourceType as Deck['sourceType'],
    isArchived: d.isArchived ?? false,
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * GET /api/decks
 * Returns list of decks. Supports filtering by user or active session.
 */
export async function GET(request: Request) {
  try {
    await ensureDbReady();
    const user = await getAuthenticatedUser(request, true);

    // If registered user, fetch their decks or public decks
    let decks;
    if (user && !user.isGuest) {
      decks = await prisma.deck.findMany({
        where: {
          OR: [{ userId: user.id }, { userId: 'guest' }, { userId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      decks = await prisma.deck.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(decks.map(mapDeck));
  } catch (error) {
    console.error('Error fetching decks:', error);
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 });
  }
}

/**
 * POST /api/decks
 * Body: { title: string, sourceType?: 'pdf' | 'text' | 'image' }
 * Validates max length, deduplicates rapid double-submits, enforces rate-limits.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`deck_create:${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Creation limit reached. Please wait ${rateCheck.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    await ensureDbReady();
    const user = await getAuthenticatedUser(request, true);
    const body = await request.json().catch(() => null);

    if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ error: 'Deck title is required' }, { status: 400 });
    }

    const title = body.title.trim();

    // Input boundary validation
    if (title.length > 120) {
      return NextResponse.json(
        { error: 'Deck title must be between 1 and 120 characters.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['pdf', 'text', 'image'];
    const sourceType = allowedTypes.includes(body.sourceType) ? body.sourceType : 'text';
    const userId = user?.id || 'guest';

    // Double-submit deduplication mutex: serializes concurrent submits with identical user and title
    const lockKey = `${userId}:${title}`;
    while (creationMutexes.has(lockKey)) {
      await creationMutexes.get(lockKey);
    }

    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((res) => {
      releaseLock = res;
    });
    creationMutexes.set(lockKey, lockPromise);

    try {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const duplicate = await prisma.deck.findFirst({
        where: {
          title,
          userId,
          createdAt: { gte: tenSecondsAgo },
        },
      });

      if (duplicate) {
        return NextResponse.json(mapDeck(duplicate), { status: 200 });
      }

      const deck = await prisma.deck.create({
        data: {
          title,
          sourceType,
          userId,
        },
      });

      return NextResponse.json(mapDeck(deck), { status: 201 });
    } finally {
      creationMutexes.delete(lockKey);
      releaseLock();
    }
  } catch (error) {
    console.error('Error creating deck:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create deck: ${detail}` },
      { status: 500 }
    );
  }
}
