'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Deck, DeckStats, Card } from '@/types';
import { getLocalCustomDecks, getLocalCustomCards } from '@/lib/data';
import { BackButton, Button } from '@/components/ui';
import DeckDetailClient from './DeckDetailClient';

interface Props {
  deckId: string;
  initialDeck: Deck | null;
  initialStats: DeckStats | null;
  initialCards: Card[];
}

export default function DeckPageResilient({
  deckId,
  initialDeck,
  initialStats,
  initialCards,
}: Props) {
  const [deck, setDeck] = useState<Deck | null>(initialDeck);
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [stats, setStats] = useState<DeckStats | null>(initialStats);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // If deck wasn't found on the server (e.g. client-side deck in localStorage on Vercel)
    if (!initialDeck) {
      const customDecks = getLocalCustomDecks();
      const found = customDecks.find((d) => d.id === deckId);
      if (found) {
        setDeck(found);
        const localCards = getLocalCustomCards(deckId);
        setCards(localCards);
        setStats({
          deckId,
          totalCards: localCards.length,
          dueNow: localCards.length,
          masteredCount: 0,
          accuracyLast7Days: 1.0,
        });
      }
    } else {
      // Check if localStorage has more recent custom cards for this deck
      const localCards = getLocalCustomCards(deckId);
      if (localCards.length > 0 && initialCards.length === 0) {
        setCards(localCards);
      }
    }
  }, [deckId, initialDeck, initialCards]);

  if (!mounted) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Loading study deck…
        </p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[24px] flex items-center justify-center mx-auto">
          📚
        </div>
        <h2 className="text-[20px] font-bold text-[var(--color-text)]">
          Study Deck Not Found
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
          This deck may not exist or was cleared from your browser session. You can create a new deck or return to your dashboard.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="secondary" size="md">
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/decks/new">
            <Button variant="primary" size="md">
              Create New Deck
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const effectiveStats: DeckStats = stats || {
    deckId,
    totalCards: cards.length,
    dueNow: cards.length,
    masteredCount: 0,
    accuracyLast7Days: 1.0,
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <BackButton href="/" label="Dashboard" />
        <span className="text-[var(--color-text-tertiary)] text-[13px]">/</span>
        <span className="text-[13px] font-medium text-[var(--color-text-secondary)] truncate max-w-[200px] sm:max-w-md">
          {deck.title}
        </span>
      </div>

      <DeckDetailClient deck={deck} stats={effectiveStats} cards={cards} />
    </>
  );
}
