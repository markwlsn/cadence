/**
 * /lib/ai/client.ts
 *
 * Multi-provider AI client (Gemini + Anthropic) — server-side ONLY.
 * ⚠️  Never import this file from client-side code.
 *     API keys must never be exposed to the browser.
 *
 * Usage:
 *   import { generateTextWithAI, transcribeImageWithAI, isAIConfigured } from '@/lib/ai/client';
 */

import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'gemini' | 'anthropic';

/**
 * Determine which provider to use based on env configuration.
 * Defaults to Gemini if GEMINI_API_KEY is present, else Anthropic.
 */
export function getAIProvider(): AIProvider {
  if (process.env.AI_PROVIDER === 'anthropic') return 'anthropic';
  if (process.env.AI_PROVIDER === 'gemini') return 'gemini';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'gemini';
}

/** Check if at least one valid AI provider key is set. */
export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

// ---------------------------------------------------------------------------
// Anthropic SDK Singleton (Backward Compatibility)
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        '[Cadence] ANTHROPIC_API_KEY is not set. ' +
        'Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env.local.'
      );
    }
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropicClient;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const client = getAnthropic();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export const GENERATION_MODEL: string =
  process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-5';

export const VISION_MODEL: string =
  process.env.ANTHROPIC_VISION_MODEL ?? 'claude-opus-4-5';

export const GEMINI_MODEL: string =
  process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';

// ---------------------------------------------------------------------------
// Unified Generation Interface
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generate a text completion from either Gemini or Claude.
 */
export async function generateTextWithAI(options: {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const provider = getAIProvider();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[Cadence] Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured. ' +
        'Please add your API key to .env.local.'
      );
    }

    const preferredModel = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
    const modelsToTry = [
      ...new Set([
        preferredModel,
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
      ]),
    ];

    let lastError: Error | null = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const model = modelsToTry[mIdx];
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const contents = options.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const body: Record<string, unknown> = {
          system_instruction: {
            parts: [{ text: options.systemPrompt }],
          },
          contents,
        };

        if (options.jsonMode) {
          body.generationConfig = {
            responseMimeType: 'application/json',
            temperature: 0.2,
          };
        }

        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errData = (await res.json().catch(() => ({}))) as any;
          const errMsg = errData?.error?.message ?? res.statusText;

          // Check for rate limits or high demand
          if (res.status === 429 || res.status === 503) {
            const retryMatch = errMsg.match(/retry in ([0-9.]+)s/i);
            const waitSec = retryMatch ? parseFloat(retryMatch[1]) : 0;

            // If short wait (<= 6 seconds), sleep and retry this model once
            if (waitSec > 0 && waitSec <= 6) {
              console.warn(`[Gemini] ${model} rate limited, waiting ${(waitSec + 1).toFixed(1)}s before retry...`);
              await new Promise((r) => setTimeout(r, Math.ceil((waitSec + 1) * 1000)));
              res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
            }
          }

          if (!res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errData2 = (await res.json().catch(() => ({}))) as any;
            const errMsg2 = errData2?.error?.message ?? errMsg;

            if (res.status === 429 || res.status === 503) {
              if (mIdx < modelsToTry.length - 1) {
                console.warn(
                  `[Gemini] ${model} quota/rate limited (${res.status}). Cascading to fallback: ${modelsToTry[mIdx + 1]}...`
                );
                continue;
              }
            }
            throw new Error(`Gemini API error (${res.status}): ${errMsg2}`);
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Gemini returned an empty response.');
        }
        return text;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (mIdx < modelsToTry.length - 1) {
          continue;
        }
      }
    }

    const friendlyMsg =
      lastError?.message?.includes('quota') || lastError?.message?.includes('429')
        ? 'Google Gemini free-tier rate limit reached (15 requests/min or project quota). Please wait 30 seconds before retrying, or upgrade your Google AI Studio plan.'
        : lastError?.message || 'Failed to generate content with Gemini.';
    throw new Error(friendlyMsg);
  }

  // Anthropic Provider
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      '[Cadence] Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured. ' +
      'Please add your API key to .env.local.'
    );
  }

  const client = getAnthropic();
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: options.maxTokens ?? 4096,
    system: options.systemPrompt,
    messages: options.messages,
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
}

/**
 * Transcribe an image using multimodal AI (Gemini or Claude Vision).
 */
export async function transcribeImageWithAI(options: {
  imageBuffer: Buffer;
  mimeType: string;
  prompt: string;
}): Promise<string> {
  const provider = getAIProvider();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[Cadence] Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured. ' +
        'Please add your API key to .env.local.'
      );
    }

    const preferredModel = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
    const modelsToTry = [
      ...new Set([
        preferredModel,
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
      ]),
    ];
    const base64Data = options.imageBuffer.toString('base64');

    let lastError: Error | null = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const modelName = modelsToTry[mIdx];
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: options.mimeType,
                      data: base64Data,
                    },
                  },
                  { text: options.prompt },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errData = (await res.json().catch(() => ({}))) as any;
          const errMsg = errData?.error?.message ?? res.statusText;
          if ((res.status === 429 || res.status === 503) && mIdx < modelsToTry.length - 1) {
            console.warn(`[Gemini Vision] ${modelName} hit ${res.status}. Trying next model...`);
            continue;
          }
          throw new Error(`Gemini Vision error (${res.status}): ${errMsg}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Gemini Vision returned an empty response.');
        }
        return text;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (mIdx < modelsToTry.length - 1) {
          continue;
        }
      }
    }

    throw lastError || new Error('Failed to transcribe image with Gemini.');
  }

  // Anthropic Provider
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      '[Cadence] Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured. ' +
      'Please add your API key to .env.local.'
    );
  }

  const client = getAnthropic();
  const base64Data = options.imageBuffer.toString('base64');
  const response = await client.messages.create({
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
              media_type: options.mimeType as
                | 'image/jpeg'
                | 'image/png'
                | 'image/gif'
                | 'image/webp',
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: options.prompt,
          },
        ],
      },
    ],
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
}
