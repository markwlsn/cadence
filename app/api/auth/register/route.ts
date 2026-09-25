import { NextResponse } from 'next/server';
import { prisma, ensureDbReady } from '@/lib/db';
import {
  hashPassword,
  createSessionToken,
  createSessionCookieHeader,
} from '@/lib/server-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`auth:${ip}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    await ensureDbReady();
    const body = await request.json().catch(() => ({}));
    const { name, email, password, avatar, phone, age } = body;

    // Strict Input Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required (max 60 characters).' }, { status: 400 });
    }
    if (name.trim().length > 60) {
      return NextResponse.json({ error: 'Name cannot exceed 60 characters.' }, { status: 400 });
    }

    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid academic or personal email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (password.length > 100) {
      return NextResponse.json({ error: 'Password cannot exceed 100 characters.' }, { status: 400 });
    }

    // Check for duplicate account
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM User WHERE email = ? LIMIT 1`,
      cleanEmail
    );
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please log in.' },
        { status: 409 }
      );
    }

    // Hash password with cryptographically secure random salt
    const passwordHash = hashPassword(password);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const cleanAvatar = typeof avatar === 'string' && avatar.trim() ? avatar.trim() : '🎓';
    const parsedAge = typeof age === 'number' && age >= 5 && age <= 120 ? Math.round(age) : null;
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 30) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO User (id, email, name, passwordHash, avatar, phone, age) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      cleanEmail,
      name.trim(),
      passwordHash,
      cleanAvatar,
      cleanPhone,
      parsedAge
    );

    const safeUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      avatar: cleanAvatar,
      isGuest: false,
      phone: cleanPhone || undefined,
      age: parsedAge || undefined,
    };

    const token = createSessionToken({
      userId,
      email: cleanEmail,
      name: name.trim(),
      avatar: cleanAvatar,
      isGuest: false,
    });

    const cookieHeader = createSessionCookieHeader(token);

    return NextResponse.json(
      { success: true, user: safeUser },
      {
        status: 201,
        headers: {
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error) {
    console.error('[auth/register] Internal error:', error);
    return NextResponse.json({ error: 'Registration failed due to a server error.' }, { status: 500 });
  }
}
