import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/server-auth';

/**
 * GET /api/user/export
 * Exports all user study data (decks, cards, review logs, profile) as structured JSON.
 * Compliance: GDPR Article 20 (Right to data portability) & FERPA
 */
export async function GET(request: Request) {
  try {
    await ensureDbReady();
    const user = await getAuthenticatedUser(request, false);

    if (!user || user.isGuest) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to export account data.' },
        { status: 401 }
      );
    }

    const [userRecord, decks] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ id: string; email: string; name: string; avatar: string; createdAt: string }>>(
        `SELECT id, email, name, avatar, createdAt FROM User WHERE id = ? LIMIT 1`,
        user.id
      ),
      prisma.deck.findMany({
        where: { userId: user.id },
        include: {
          cards: true,
          reviewLogs: true,
        },
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      studentProfile: userRecord[0] || user,
      totalDecks: decks.length,
      decks,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cadence-student-data-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('[user/export] Export failed:', error);
    return NextResponse.json({ error: 'Failed to generate student data export.' }, { status: 500 });
  }
}
