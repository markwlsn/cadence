import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import type { Deck } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapDeck(d: { id: string; title: string; sourceType: string; isArchived?: boolean; createdAt: Date }): Deck {
  return {
    id: d.id,
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
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const dataToUpdate: { isArchived?: boolean; title?: string } = {};
    if (typeof body.isArchived === 'boolean') {
      dataToUpdate.isArchived = body.isArchived;
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      dataToUpdate.title = body.title.trim();
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
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const deck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
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
