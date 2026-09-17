import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseContent } from '@/lib/ai/parse-content';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/decks/:id/ingest
 * Body: { rawText: string }
 * Returns: { chunks: string[] }
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
    const rawText = typeof body.rawText === 'string' ? body.rawText : '';

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
    }

    const chunks = await parseContent(rawText);

    return NextResponse.json({ chunks }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/decks/:id/ingest:', error);
    return NextResponse.json({ error: 'Failed to ingest content' }, { status: 500 });
  }
}
