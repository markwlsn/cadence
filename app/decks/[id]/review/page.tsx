'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Card as CardType, Rating, ReviewMode } from '@/types';
import {
  getDeck,
  getQueue,
  createSession,
  submitReview,
  recordSessionLog,
} from '@/lib/data';
import { CardStack, ConfidenceRater, RatingButtons, ModeToggle } from '@/components/review';
import { Button, Badge, ThemeToggle } from '@/components/ui';

export default function ReviewSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const deckId = (params?.id as string) || '';
  const initialMode = (searchParams?.get('mode') as ReviewMode) || 'mastery';

  const [deckTitle, setDeckTitle] = useState<string>('Deck');
  const [mode, setMode] = useState<ReviewMode>(initialMode);
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Review interaction state
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidenceBefore, setConfidenceBefore] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [selectedMcqOption, setSelectedMcqOption] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    if (deckId) {
      Promise.all([
        getDeck(deckId),
        getQueue(deckId, mode),
        createSession(deckId, mode),
      ])
        .then(([deck, queue, sId]) => {
          if (!ignore) {
            if (deck) setDeckTitle(deck.title);
            setCards(queue);
            setSessionId(sId);
            setCurrentIndex(0);
            setIsFlipped(false);
            setConfidenceBefore(undefined);
            setSelectedMcqOption(null);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (!ignore) setIsLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [deckId, mode]);

  // Handle Mode Change
  const handleModeChange = (newMode: ReviewMode) => {
    setMode(newMode);
  };

  // Flip Card
  const handleFlip = () => {
    setIsFlipped(true);
  };

  // Global spacebar listener to flip card (only when not typing in an input/textarea)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFlipped]);

  // Select Confidence Before Answer
  const handleConfidenceSelect = (rating: 1 | 2 | 3 | 4 | 5) => {
    setConfidenceBefore(rating);
    // Optional smooth hint: if card not flipped yet, user might want to flip next
  };

  // Submit Rating (Again, Hard, Good, Easy)
  const handleRate = async (rating: Rating) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Submit review & record log entry
    try {
      await submitReview({
        cardId: currentCard.id,
        rating,
        confidenceBefore,
      });

      if (sessionId) {
        await recordSessionLog(sessionId, {
          cardId: currentCard.id,
          rating,
          confidenceBefore,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }

    // Check if session complete
    if (currentIndex + 1 >= cards.length) {
      // Finished all cards! Navigate to summary
      router.push(`/decks/${deckId}/review/summary?sessionId=${sessionId}`);
    } else {
      // Advance to next card
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setConfidenceBefore(undefined);
      setSelectedMcqOption(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span className="text-[14px] text-[var(--color-text-secondary)]">
            Loading review queue…
          </span>
        </div>
      </div>
    );
  }

  // Empty queue state
  if (cards.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-[var(--color-bg)]">
        <div className="w-14 h-14 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[24px] font-bold text-[var(--color-text)] mb-2">
          {mode === 'mastery' ? 'All caught up!' : 'No cards in this deck'}
        </h2>
        <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mb-6">
          {mode === 'mastery'
            ? 'No cards are due right now in Mastery mode. Switch to Cram mode if you want to review all cards right away.'
            : 'Add notes or cards to start reviewing.'}
        </p>
        <div className="flex items-center gap-3">
          {mode === 'mastery' && (
            <Button variant="primary" onClick={() => handleModeChange('cram')}>
              Switch to Cram Mode
            </Button>
          )}
          <Link href={`/decks/${deckId}`}>
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex) / cards.length) * 100);

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[var(--color-bg)] overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/decks/${deckId}`}
              aria-label="Exit review session"
              className="text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors"
            >
              ✕ Exit
            </Link>
            <span className="hidden sm:inline-block text-[13px] text-[var(--color-text-tertiary)] truncate max-w-[140px]">
              · {deckTitle}
            </span>
          </div>

          {/* Mode Switcher */}
          <ModeToggle mode={mode} onChange={handleModeChange} />

          {/* Progress badge & Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="neutral" size="sm" className="font-mono">
              {currentIndex + 1} / {cards.length}
            </Badge>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-full h-1 bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Review Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-2xl mx-auto">
        {/* Card Stack */}
        <div className="w-full mb-6">
          <CardStack
            cards={cards}
            currentIndex={currentIndex}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onSwipe={handleRate}
            selectedMcqOption={selectedMcqOption}
            onSelectMcqOption={setSelectedMcqOption}
          />
        </div>

        {/* Interaction Controls Area */}
        <div className="w-full min-h-[110px] flex items-center justify-center">
          {!isFlipped ? (
            /* Pre-reveal: Confidence Rater + Flip Prompt */
            <div className="w-full flex flex-col items-center gap-4 animate-count-up">
              <ConfidenceRater
                value={confidenceBefore}
                onSelect={handleConfidenceSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFlip}
                className="text-[13px] text-[var(--color-accent)]"
              >
                Reveal Answer (or press Space) →
              </Button>
            </div>
          ) : (
            /* Post-reveal: Rating Buttons (Again / Hard / Good / Easy) */
            <div className="w-full animate-count-up">
              <span className="block text-center text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                Rate difficulty (or swipe card)
              </span>
              <RatingButtons onRate={handleRate} />
            </div>
          )}
        </div>
      </main>

      {/* Footer info: Keyboard & Gesture hints */}
      <footer className="py-3 px-6 text-center text-[12px] text-[var(--color-text-secondary)] border-t border-[var(--color-border)] opacity-70 pb-[max(12px,env(safe-area-inset-bottom,12px))]">
        <span className="hidden sm:inline">
          Tap card or press Space to flip · Keyboard: 1 Again, 2 Hard, 3 Good, 4 Easy · Swipe left/right
        </span>
        <span className="sm:hidden">
          Swipe card left for Again, right for Easy · Tap to flip
        </span>
      </footer>
    </div>
  );
}
