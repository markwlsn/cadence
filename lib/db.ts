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

function resolveDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || '';
  if (!url) {
    url = process.env.VERCEL ? 'file:/tmp/dev.db' : 'file:./dev.db';
    process.env.DATABASE_URL = url;
  } else if (process.env.VERCEL && url.startsWith('file:') && !url.includes('/tmp')) {
    url = 'file:/tmp/dev.db';
    process.env.DATABASE_URL = url;
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = resolveDatabaseUrl();

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

let initPromise: Promise<void> | null = null;

/**
 * Ensures SQLite tables and starter seeds exist.
 * Safe to call multiple times (runs idempotently).
 */
export async function ensureDbReady(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const dbUrl = resolveDatabaseUrl();
      if (!dbUrl.startsWith('libsql://') && !dbUrl.startsWith('postgres') && !dbUrl.startsWith('mysql')) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS Deck (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sourceType TEXT NOT NULL,
            isArchived BOOLEAN NOT NULL DEFAULT 0,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS Card (
            id TEXT PRIMARY KEY,
            deckId TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'basic',
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            explanation TEXT,
            options TEXT,
            due DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            stability REAL NOT NULL DEFAULT 0,
            difficulty REAL NOT NULL DEFAULT 5.0,
            lastReviewed DATETIME,
            reps INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            state TEXT NOT NULL DEFAULT 'New',
            scheduledDays REAL NOT NULL DEFAULT 0,
            learningSteps INTEGER NOT NULL DEFAULT 0,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (deckId) REFERENCES Deck(id) ON DELETE CASCADE
          );
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS ReviewLogEntry (
            id TEXT PRIMARY KEY,
            cardId TEXT NOT NULL,
            deckId TEXT NOT NULL,
            rating TEXT NOT NULL,
            confidenceBefore INTEGER,
            reviewedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scheduledDays REAL NOT NULL DEFAULT 0,
            elapsedDays REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (cardId) REFERENCES Card(id) ON DELETE CASCADE,
            FOREIGN KEY (deckId) REFERENCES Deck(id) ON DELETE CASCADE
          );
        `);

        // Check if decks exist, if 0 seed defaults
        const count = await prisma.deck.count().catch(() => 0);
        if (count === 0) {
          const { mockDecks } = await import('./mocks/decks');
          const { mockCards } = await import('./mocks/cards');
          for (const d of mockDecks) {
            await prisma.deck.create({
              data: {
                id: d.id,
                title: d.title,
                sourceType: d.sourceType,
                createdAt: new Date(d.createdAt),
              },
            }).catch(() => {});
          }
          for (const c of mockCards) {
            await prisma.card.create({
              data: {
                id: c.id,
                deckId: c.deckId,
                type: c.type || 'basic',
                front: c.front,
                back: c.back,
                explanation: c.explanation,
                options: c.options ? JSON.stringify(c.options) : null,
                due: new Date(c.due),
                stability: c.stability,
                difficulty: c.difficulty,
                reps: c.reps,
              },
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[db] Auto-initialization warning:', err);
    }
  })();

  return initPromise;
}
