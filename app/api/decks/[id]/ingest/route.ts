import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseContent, parsePdf, parseImage } from '@/lib/ai/parse-content';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Touched to trigger Next.js route recompile
/**
 * POST /api/decks/:id/ingest
 * Body: { rawText: string } OR multipart/form-data with file
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

    const contentType = request.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textParam = formData.get('rawText') as string | null;

      if (textParam && textParam.trim()) {
        rawText = textParam.trim();
      } else if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || '';

        if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          console.log('[ingest route] Calling parsePdf with buffer length:', buffer.length);
          rawText = await parsePdf(buffer);
          console.log('[ingest route] parsePdf returned length:', rawText.length);
        } else if (
          mimeType.startsWith('image/') ||
          /\.(jpe?g|png|gif|webp)$/i.test(file.name)
        ) {
          const resolvedMime = mimeType || 'image/jpeg';
          rawText = await parseImage(buffer, resolvedMime);
        } else if (
          mimeType === 'text/plain' ||
          mimeType === 'text/markdown' ||
          /\.(txt|md|markdown)$/i.test(file.name)
        ) {
          rawText = buffer.toString('utf-8');
        } else {
          return NextResponse.json(
            { error: 'Unsupported file format. Please upload a PDF, image, or text file.' },
            { status: 400 }
          );
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (typeof body.rawText === 'string') {
        rawText = body.rawText;
      }
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: 'rawText or valid file is required' },
        { status: 400 }
      );
    }

    const chunks = await parseContent(rawText);

    return NextResponse.json({ chunks }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/decks/:id/ingest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to ingest content' },
      { status: 500 }
    );
  }
}
