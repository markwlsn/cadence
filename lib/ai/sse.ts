/**
 * lib/ai/sse.ts
 *
 * Pure helper for Server-Sent Events (SSE) in streaming AI rationale.
 * Formats events and parses chunk streams, handling split chunks,
 * multiple events per chunk, empty chunks, and malformed JSON.
 */

import type { SSERationaleEvent } from '@/types';

/**
 * Formats an SSE event into standard SSE line syntax: data: {...}\n\n
 */
export function formatSSEEvent(event: SSERationaleEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Stateful SSE chunk parser capable of handling fragmented chunks,
 * multi-event chunks, empty chunks, and malformed JSON payloads.
 */
export class SSEParser {
  private buffer = '';

  /**
   * Feeds a raw text chunk into the parser and returns all complete events parsed.
   */
  feed(chunk: string): SSERationaleEvent[] {
    if (!chunk) return [];
    this.buffer += chunk;
    const events: SSERationaleEvent[] = [];

    // Normalize Windows CRLF to standard LF
    const normalized = this.buffer.replace(/\r\n/g, '\n');
    const parts = normalized.split('\n\n');

    // The last part is incomplete unless followed by another \n\n
    this.buffer = parts.pop() ?? '';

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:')) {
          const jsonStr = trimmedLine.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr) as SSERationaleEvent;
            if (parsed && typeof parsed.type === 'string') {
              events.push(parsed);
            }
          } catch {
            // Malformed JSON is skipped gracefully without crashing
          }
        }
      }
    }

    return events;
  }

  /**
   * Resets the internal fragmentation buffer.
   */
  reset(): void {
    this.buffer = '';
  }
}

/**
 * Factory helper for creating an SSEParser instance.
 */
export function createSSEParser(): SSEParser {
  return new SSEParser();
}

/**
 * Parses streaming Socratic rationale markdown into 3 distinct sections:
 * 1. correctPrinciple (Causal Mechanism / Why Correct)
 * 2. misconception (Cognitive Trap / Distractor Analysis)
 * 3. keyTakeaway (Anchor Takeaway)
 */
export interface ParsedRationaleSections {
  correctPrinciple: string;
  misconception: string;
  keyTakeaway: string;
}

export function parseStreamingRationale(rawText: string): ParsedRationaleSections {
  if (!rawText) {
    return { correctPrinciple: '', misconception: '', keyTakeaway: '' };
  }

  const h1Match = /(?:###\s*(?:1[.)]?\s*)?(?:Why The Correct Answer Is Right|Causal Mechanism|Correct Principle)[\s\S]*?)(?=###\s*(?:2[.)]?\s*)?(?:Cognitive Trap|Why Other Options|Distractor)|$)/i.exec(rawText);
  const h2Match = /(?:###\s*(?:2[.)]?\s*)?(?:Cognitive Trap|Why Other Options|Distractor Analysis|Misconception)[\s\S]*?)(?=###\s*(?:3[.)]?\s*)?(?:Anchor Takeaway|Key Takeaway)|$)/i.exec(rawText);
  const h3Match = /(?:###\s*(?:3[.)]?\s*)?(?:Anchor Takeaway|Key Takeaway)[\s\S]*)/i.exec(rawText);

  const cleanHeading = (content: string | undefined): string => {
    if (!content) return '';
    return content.replace(/^###[^\n]*\n?/m, '').trim();
  };

  const correctPrinciple = cleanHeading(h1Match?.[0]);
  const misconception = cleanHeading(h2Match?.[0]);
  const keyTakeaway = cleanHeading(h3Match?.[0]);

  if (!h1Match && !h2Match && !h3Match) {
    return {
      correctPrinciple: rawText.trim(),
      misconception: '',
      keyTakeaway: '',
    };
  }

  return {
    correctPrinciple,
    misconception,
    keyTakeaway,
  };
}

/**
 * Parses all complete SSE events from a given text string.
 */
export function parseSSEEvents(rawText: string): SSERationaleEvent[] {
  const parser = new SSEParser();
  return parser.feed(rawText);
}


