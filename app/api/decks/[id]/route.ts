import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/server-auth';
import type { Deck } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
 * GET /api/decks/:id
 * Returns a single deck by ID.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await ensureDbReady();
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

/**
 * PATCH /api/decks/:id
 * Updates deck properties (archive/unarchive, title).
 * Enforces ownership check and input length constraints.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureDbReady();
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request, true);

    const existingDeck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Ownership verification: if deck is claimed by another registered user, block unauthorized edits
    const rawDeck = existingDeck as typeof existingDeck & { userId?: string | null };
    if (
      rawDeck.userId &&
      rawDeck.userId !== 'guest' &&
      user &&
      !user.isGuest &&
      rawDeck.userId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden: You do not own this deck.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const dataToUpdate: { isArchived?: boolean; title?: string } = {};
    if (typeof body.isArchived === 'boolean') {
      dataToUpdate.isArchived = body.isArchived;
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      const trimmed = body.title.trim();
      if (trimmed.length > 120) {
        return NextResponse.json(
          { error: 'Deck title must be 120 characters or fewer.' },
          { status: 400 }
        );
      }
      dataToUpdate.title = trimmed;
    }

    const updated = await prisma.deck.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(mapDeck(updated), { status: 200 });
  } catch (error) {
    console.error('Error updating deck:', error);
    return NextResponse.json({ error: 'Failed to update deck' }, { status: 500 });
  }
}

/**
 * DELETE /api/decks/:id
 * Permanently deletes a deck and cascades to all its cards and review logs.
 * Enforces ownership check against IDOR exploits.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    await ensureDbReady();
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request, true);

    const existingDeck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Ownership check: if deck belongs to another registered user, forbid deletion
    const rawDeck = existingDeck as typeof existingDeck & { userId?: string | null };
    if (
      rawDeck.userId &&
      rawDeck.userId !== 'guest' &&
      user &&
      !user.isGuest &&
      rawDeck.userId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this deck.' }, { status: 403 });
    }

    await prisma.deck.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json({ error: 'Failed to delete deck' }, { status: 500 });
  }
}
