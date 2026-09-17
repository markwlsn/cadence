/**
 * /lib/db.ts — Prisma client singleton
 *
 * Uses the global pattern to avoid spawning a new PrismaClient on every
 * hot-reload in Next.js dev mode (which exhausts the connection pool).
 *
 * Owner: Chat 2 — Backend
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
