/**
 * /lib/server-auth.ts — Server-Side Cryptographic Authentication & Session Engine
 *
 * Implements:
 * - Scrypt password hashing with cryptographically secure random salt
 * - Timing-safe password verification
 * - Cryptographically signed session tokens (HMAC-SHA256)
 * - HTTP-only session cookie management
 * - Strict User Ownership & Access Control for Academic Data
 */

import crypto from 'crypto';
import { prisma, ensureDbReady } from '@/lib/db';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'cadence_production_auth_secret_k7x9m2p4q8w1v5z';
const SESSION_COOKIE_NAME = 'cadence_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isGuest: boolean;
  phone?: string;
  age?: number;
}

interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  isGuest: boolean;
  exp: number;
}

/**
 * Hash a password using scrypt with a 16-byte cryptographically secure random salt.
 * Returns format: "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored "salt:hash" using timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;

    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;

    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Create a base64url signed session token using HMAC-SHA256.
 */
export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract session token from Request cookies or Authorization header.
 */
export function getSessionTokenFromRequest(request: Request): string | null {
  // Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Check Cookie: cadence_session=<token>
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.substring(SESSION_COOKIE_NAME.length + 1).trim();
    }
  }

  return null;
}

/**
 * Authenticate incoming request and return the active User session.
 * If unauthenticated, returns a safe guest fallback identity or null.
 */
export async function getAuthenticatedUser(
  request: Request,
  allowGuestFallback: boolean = true
): Promise<AuthenticatedUser | null> {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      return {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        avatar: payload.avatar,
        isGuest: payload.isGuest,
      };
    }
  }

  if (allowGuestFallback) {
    return {
      id: 'guest_session',
      email: 'guest@cadence.app',
      name: 'Guest Scholar',
      avatar: '🎓',
      isGuest: true,
    };
  }

  return null;
}

/**
 * Format the Set-Cookie header string for session token.
 */
export function createSessionCookieHeader(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; ${secure}`;
}

/**
 * Format the Set-Cookie header string to clear session token on logout.
 */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax;`;
}
