/**
 * /lib/ai/parse-content.ts
 *
 * Content parsing pipeline: PDF extraction, image transcription, semantic chunking.
 * All functions are server-side only (Node.js Buffer, Claude vision API).
 *
 * Public API (R-10 — locked signatures):
 *   parseContent(rawText: string): Promise<string[]>
 *   parsePdf(buffer: Buffer): Promise<string>
 *   parseImage(imageBuffer: Buffer, mimeType: string): Promise<string>
 */

import { anthropic, VISION_MODEL } from './client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CHUNK_WORDS = 30;   // chunks below this are dropped (headings/captions)
const TARGET_MIN_WORDS = 150; // merge chunks below this with a neighbour
const TARGET_MAX_WORDS = 400; // split chunks above this at a sentence boundary

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Count words in a string (whitespace-split). */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Split a chunk that exceeds TARGET_MAX_WORDS at the sentence boundary
 * nearest to its midpoint (in words).
 */
function splitLongChunk(text: string): [string, string] {
  const words = text.split(/\s+/).filter(Boolean);
  const mid = Math.floor(words.length / 2);

  // Reconstruct the text and find sentence boundaries near mid
  // We scan backwards then forwards from the midpoint to find a '.', '!', or '?'
  // followed by whitespace.
  const sentenceEndRe = /[.!?]\s/g;
  let best: number | null = null;
  let bestDistance = Infinity;

  let charPos = 0;
  let wordIdx = 0;
  const charAtWord: number[] = [];

  for (const w of words) {
    charAtWord.push(charPos);
    charPos += w.length + 1; // +1 for space
    wordIdx++;
  }

  let match: RegExpExecArray | null;
  while ((match = sentenceEndRe.exec(text)) !== null) {
    const splitPos = match.index + 1; // after the punctuation
    // Find which word index this corresponds to
    let wIdx = charAtWord.findIndex((c) => c > splitPos);
    if (wIdx === -1) wIdx = words.length;
    const dist = Math.abs(wIdx - mid);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = splitPos + 1; // +1 to skip the space
    }
  }

  if (best === null || best <= 0 || best >= text.length) {
    // No sentence boundary found — split at word midpoint
    const half = words.slice(0, mid).join(' ');
    const rest = words.slice(mid).join(' ');
    return [half, rest];
  }

  return [text.slice(0, best).trim(), text.slice(best).trim()];
}

/**
 * Detect whether a line is a heading:
 * - Markdown heading: starts with one to three `#` characters
 * - ALL-CAPS line of 3+ words (common in scanned/plain-text notes)
 */
function isHeading(line: string): boolean {
  if (/^#{1,3}\s/.test(line.trim())) return true;
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3 && words.every((w) => w === w.toUpperCase() && /[A-Z]/.test(w))) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Chunking algorithm (R-06)
// ---------------------------------------------------------------------------

/**
 * Split raw text into concept-sized chunks (150–400 words each).
 *
 * Algorithm:
 *  1. Split on heading markers → coarse sections
 *  2. Within each section, split on double newlines → paragraphs
 *  3. Merge consecutive short paragraphs until ≥ TARGET_MIN_WORDS
 *  4. Split chunks that exceed TARGET_MAX_WORDS at nearest sentence boundary
 *  5. Drop chunks < MIN_CHUNK_WORDS (headings-only, captions)
 */
export async function parseContent(rawText: string): Promise<string[]> {
  // Step 1: Split on heading lines
  const lines = rawText.split('\n');
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isHeading(line) && current.length > 0) {
      sections.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join('\n'));

  // Step 2: Within each section, split on double newlines
  const paragraphs: string[] = [];
  for (const section of sections) {
    const parts = section.split(/\n{2,}/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 0) paragraphs.push(trimmed);
    }
  }

  // Step 3: Merge short paragraphs with their successor
  const merged: string[] = [];
  let accumulator = '';

  for (const para of paragraphs) {
    if (accumulator === '') {
      accumulator = para;
    } else {
      const combined = accumulator + '\n\n' + para;
      if (wordCount(combined) <= TARGET_MAX_WORDS) {
        // Check if accumulator is still short — keep merging
        if (wordCount(accumulator) < TARGET_MIN_WORDS) {
          accumulator = combined;
        } else {
          // Accumulator is long enough — flush it, start fresh
          merged.push(accumulator);
          accumulator = para;
        }
      } else {
        // Combined would be too long — flush accumulator, start fresh
        merged.push(accumulator);
        accumulator = para;
      }
    }
  }
  if (accumulator.length > 0) merged.push(accumulator);

  // Step 4: Split over-long chunks
  const sized: string[] = [];
  for (const chunk of merged) {
    if (wordCount(chunk) > TARGET_MAX_WORDS) {
      const [a, b] = splitLongChunk(chunk);
      // Recursively split if still too long (handles very long paragraphs)
      const subChunks = await parseContent(a + (b ? '\n\n' + b : ''));
      sized.push(...subChunks);
    } else {
      sized.push(chunk);
    }
  }

  // Step 5: Drop noise chunks (fallback to raw paragraphs if text is short)
  const filtered = sized.filter((c) => wordCount(c) >= MIN_CHUNK_WORDS);
  if (filtered.length > 0) return filtered;
  return rawText.split('\n\n').map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// PDF extraction (R-07)
// ---------------------------------------------------------------------------

/**
 * Extract plain text from a PDF buffer using pdf-parse.
 * The returned text should be passed to parseContent for chunking.
 *
 * @param buffer - Raw PDF file contents as a Node.js Buffer.
 * @returns      - Extracted plain text.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import of pdf-parse lib bypasses test debug runner in index.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = typeof mod === 'function' ? mod : (mod.default || mod);
  if (typeof pdfParse === 'function') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  throw new Error('[parsePdf] Could not initialize PDF parser.');
}

// ---------------------------------------------------------------------------
// Vision transcription (R-08)
// ---------------------------------------------------------------------------

/**
 * Transcribe an image (handwritten notes, photographed text) using Claude vision.
 * The returned Markdown text should be passed to parseContent for chunking.
 *
 * No separate OCR library — Claude vision handles handwriting, equations, and
 * diagram labels in a single API call (see design.md §7 for rationale).
 *
 * @param imageBuffer - Raw image file contents as a Node.js Buffer.
 * @param mimeType    - MIME type of the image, e.g. 'image/jpeg', 'image/png'.
 * @returns           - Transcribed text in Markdown format.
 */
export async function parseImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  // Validate mimeType is a supported image format
  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supported.includes(mimeType)) {
    throw new Error(
      `[parseImage] Unsupported MIME type "${mimeType}". ` +
      `Supported: ${supported.join(', ')}`
    );
  }

  const base64Data = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Data,
            },
          },
          {
            type: 'text',
            text:
              'Transcribe all text visible in this image exactly as written. ' +
              'Preserve the document structure using Markdown: ' +
              'use # for main headings, ## for subheadings, - for bullet lists, ' +
              '**bold** for emphasis, and ` backticks ` for inline equations or code. ' +
              'If you see a diagram, describe it in a [Diagram: ...] block, ' +
              'then transcribe any labels or annotations. ' +
              'Do not add commentary or explanations — transcribe only.',
          },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('[parseImage] Unexpected response type from Claude vision API.');
  }
  return block.text;
}
