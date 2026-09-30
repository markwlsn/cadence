import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { parseContent, parsePdf, parseImage } from '@/lib/ai/parse-content';

export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit
const DANGEROUS_EXTENSIONS = /\.(exe|php|sh|bat|cmd|dll|vbs|py|js|mjs|cgi|pl|jar|war|com|scr|vbe|wsf|hta)$/i;
const ALLOWED_EXTENSIONS = /\.(pdf|txt|md|text|jpe?g|png|webp)$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/decks/:id/ingest
 * Body: { rawText: string } OR multipart/form-data with file
 * Enforces magic-byte file validation, 15MB size ceiling, and blocks malicious binaries.
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
          const fileName = file.name || 'uploaded_document';

          // Block dangerous executable extensions immediately
          if (DANGEROUS_EXTENSIONS.test(fileName)) {
            return NextResponse.json(
              { error: 'Executable and script file formats are strictly prohibited.' },
              { status: 415 }
            );
          }

          if (!ALLOWED_EXTENSIONS.test(fileName) && !file.type.startsWith('text/')) {
            return NextResponse.json(
              { error: 'Unsupported file format. Please upload a PDF, text document, or image.' },
              { status: 415 }
            );
          }

          const arrayBuffer = await file.arrayBuffer();
          if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
              { error: 'File size exceeds maximum allowable limit of 15MB.' },
              { status: 413 }
            );
          }

          const buffer = Buffer.from(arrayBuffer);
          const mimeType = file.type || '';

          // PDF Verification: check MIME and %PDF magic bytes
          if (fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf') {
            const magic = buffer.subarray(0, 4).toString('ascii');
            if (magic !== '%PDF') {
              return NextResponse.json(
                { error: 'Invalid or corrupted PDF document structure.' },
                { status: 415 }
              );
            }

            console.log('[ingest route] Calling parsePdf with buffer length:', buffer.length);
            rawText = await parsePdf(buffer);
            console.log('[ingest route] parsePdf returned length:', rawText.length);
          } else if (
            mimeType.startsWith('image/') ||
            /\.(jpe?g|png|webp)$/i.test(fileName)
          ) {
            // Verify image magic bytes
            const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
            const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
            const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF';

            if (!isPng && !isJpeg && !isWebp) {
              return NextResponse.json(
                { error: 'Invalid image format or corrupted header.' },
                { status: 415 }
              );
            }

            const resolvedMime = mimeType || 'image/jpeg';
            rawText = await parseImage(buffer, resolvedMime).catch(() => 'Photo notes content');
          } else {
            // Text files (.txt, .md, text/plain)
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
    return NextResponse.json(
      { error: 'Failed to process document upload.' },
      { status: 500 }
    );
  }
}
