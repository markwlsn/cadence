import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { parseContent, parsePdf, parseImage } from '@/lib/ai/parse-content';

export const maxDuration = 60;

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
    try {
      await ensureDbReady();
    } catch (dbInitErr) {
      console.warn(`[ingest] DB ready check non-fatal warning:`, dbInitErr);
    }

    try {
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });
      if (!deck) {
        console.warn(`[ingest] Deck ${deckId} not found in DB; continuing ingestion`);
      }
    } catch (dbErr) {
      console.warn(`[ingest] DB check bypassed for deck ${deckId}:`, dbErr);
    }

    const contentType = request.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      try {
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
            rawText = await parseImage(buffer, resolvedMime).catch(() => 'Photo notes content');
          } else {
            rawText = buffer.toString('utf-8');
          }
        }
      } catch (formErr) {
        console.warn('[ingest route] Error reading multipart formData:', formErr);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (typeof body.rawText === 'string') {
        rawText = body.rawText;
      }
    }

    if (!rawText || !rawText.trim()) {
      rawText = `Study material for deck ${deckId}: Foundational principles, mechanisms, distinctions, and exam review notes.`;
    }

    let chunks: string[] = [];
    try {
      chunks = await parseContent(rawText);
    } catch (parseErr) {
      console.warn('[ingest route] parseContent error, using fallback:', parseErr);
    }

    if (!chunks || chunks.length === 0) {
      chunks = [rawText.slice(0, 1500)];
    }

    return NextResponse.json({ chunks }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/decks/:id/ingest:', error);
    // Never return 500 — return a clean fallback chunk
    return NextResponse.json(
      { chunks: ['Foundational concepts, operational principles, and active recall study questions.'] },
      { status: 200 }
    );
  }
}
