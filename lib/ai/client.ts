/**
 * /lib/ai/client.ts
 *
 * Anthropic SDK singleton — server-side ONLY.
 * ⚠️  Never import this file from client-side code.
 *     The API key must never be exposed to the browser.
 *
 * Usage:
 *   import { anthropic, GENERATION_MODEL, VISION_MODEL } from '@/lib/ai/client';
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        '[Cadence] ANTHROPIC_API_KEY is not set. ' +
        'Add it to .env.local before running server-side code or the test pipeline.'
      );
    }
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _client;
}

/** Singleton Anthropic client proxy. Reuse across requests and lazily validate key on access. */
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const client = getAnthropic();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

/**
 * Model used for card generation (highest-quality reasoning).
 * Override with ANTHROPIC_MODEL env var.
 */
export const GENERATION_MODEL: string =
  process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-5';

/**
 * Model used for vision-based image transcription.
 * Override with ANTHROPIC_VISION_MODEL env var.
 */
export const VISION_MODEL: string =
  process.env.ANTHROPIC_VISION_MODEL ?? 'claude-opus-4-5';
