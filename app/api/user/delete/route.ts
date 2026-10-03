import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import { getAuthenticatedUser, clearSessionCookieHeader } from '@/lib/server-auth';

/**
 * POST /api/user/delete
 * Permanently deletes the student account and cascades to all decks, cards, and review logs.
 * Compliance: GDPR Article 17 (Right to Erasure) & FERPA student records purging
 */
export async function POST(request: Request) {
  try {
    await ensureDbReady();
    const user = await getAuthenticatedUser(request, false);

    if (!user || user.isGuest) {
      return NextResponse.json(
        { error: 'Unauthorized: No active registered account to delete.' },
        { status: 401 }
      );
    }

    // 1. Delete all user decks (cascades to cards and review logs via Prisma schema)
    await prisma.deck.deleteMany({
      where: { userId: user.id },
    });

    // 2. Delete user profile record
    await prisma.$executeRawUnsafe(`DELETE FROM User WHERE id = ?`, user.id);

    return NextResponse.json(
      { success: true, message: 'Your account and all associated study materials have been permanently erased.' },
      {
        status: 200,
        headers: {
          'Set-Cookie': clearSessionCookieHeader(),
        },
      }
    );
  } catch (error) {
    console.error('[user/delete] Deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete student account.' }, { status: 500 });
  }
}
