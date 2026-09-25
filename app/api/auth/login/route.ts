import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import {
  verifyPassword,
  createSessionToken,
  createSessionCookieHeader,
} from '@/lib/server-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`auth:${ip}`, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds}s before retrying.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    await ensureDbReady();
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Please enter both email and password.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const users = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        email: string;
        name: string;
        passwordHash: string;
        avatar: string;
        phone: string | null;
        age: number | null;
      }>
    >(`SELECT id, email, name, passwordHash, avatar, phone, age FROM User WHERE email = ? LIMIT 1`, cleanEmail);

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];
    const isPasswordValid = verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isGuest: false,
      phone: user.phone || undefined,
      age: user.age || undefined,
    };

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isGuest: false,
    });

    const cookieHeader = createSessionCookieHeader(token);

    return NextResponse.json(
      { success: true, user: safeUser },
      {
        status: 200,
        headers: {
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error) {
    console.error('[auth/login] Internal error:', error);
    return NextResponse.json({ error: 'Authentication failed due to a server error.' }, { status: 500 });
  }
}
