/**
 * /lib/db.ts — Prisma client singleton
 *
 * Supports local SQLite for fast development and Turso (libSQL) adapter
 * for serverless production deployments.
 *
 * Owner: Chat 2 — Backend / Integration
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || '';

  // Remote Turso libSQL support for Vercel / serverless deployments
  if (dbUrl.startsWith('libsql://')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client');
      const libsql = createClient({
        url: dbUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      const adapter = new PrismaLibSQL(libsql);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new PrismaClient({ adapter } as any);
    } catch (e) {
      console.warn('[db] Failed to initialize LibSQL adapter, falling back to standard client:', e);
    }
  }

  // Standard SQLite / PostgreSQL / local dev
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
