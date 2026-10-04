import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';

export async function GET() {
  try {
    const startTime = Date.now();
    await ensureDbReady();
    await prisma.$queryRawUnsafe('SELECT 1');
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'connected',
          latencyMs: dbLatencyMs,
        },
        version: '0.2.1',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[health check] Failure:', error);
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Database connectivity degraded',
      },
      { status: 503 }
    );
  }
}
