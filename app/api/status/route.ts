import { NextResponse } from 'next/server';
import { isAIConfigured, getAIProvider, GEMINI_MODEL } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isAIConfigured();
  const provider = getAIProvider();
  const geminiKey = process.env.GEMINI_API_KEY;

  let keyPreview = 'Not set';
  if (geminiKey && geminiKey.length > 8) {
    keyPreview = `${geminiKey.slice(0, 6)}...${geminiKey.slice(-4)}`;
  } else if (geminiKey) {
    keyPreview = 'Set (short key)';
  }

  return NextResponse.json({
    status: 'ok',
    aiConfigured: configured,
    provider,
    model: GEMINI_MODEL,
    keyPreview,
    environment: process.env.VERCEL ? 'vercel' : 'local',
  });
}
