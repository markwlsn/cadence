'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Card as CardType, Rating, ReviewMode } from '@/types';
import {
  getDeck,
  getQueue,
  getDeckCards,
  createSession,
  submitReview,
  recordSessionLog,
  getLocalCustomDecks,
  getLocalCustomCards,
} from '@/lib/data';
import {
  getAssessmentCards,
  saveAssessmentProgress,
  ASSESSMENT_CONFIGS,
} from '@/lib/assessments';
import { CardStack, ConfidenceRater, RatingButtons, ModeToggle, AIRationaleModal } from '@/components/review';
import { Button, Badge, ThemeToggle } from '@/components/ui';
import { recordMistake } from '@/lib/mistakes';

export default function ReviewSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const deckId = (params?.id as string) || '';
  const initialMode = (searchParams?.get('mode') as ReviewMode) || 'mastery';
  const assessmentId = searchParams?.get('assessment') || null;

  const drillMode = searchParams?.get('drill'); // 'mistakes'
  const drillCardsParam = searchParams?.get('cards'); // comma separated card IDs

  const assessmentConfig = assessmentId
    ? ASSESSMENT_CONFIGS.find((a) => a.id === assessmentId) || null
    : null;

  const isExam = assessmentId === 'comprehensive_exam' || assessmentId === 'exam-35';

  const [deckTitle, setDeckTitle] = useState<string>('Deck');
  const [mode, setMode] = useState<ReviewMode>(initialMode);
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Exam timer: 35 minutes default
  const [timeLeft, setTimeLeft] = useState(35 * 60);
  const [timerActive, setTimerActive] = useState(true);

  // Review interaction state
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidenceBefore, setConfidenceBefore] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [selectedMcqOption, setSelectedMcqOption] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isRationaleOpen, setIsRationaleOpen] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isExam || !timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isExam, timerActive, timeLeft]);

  const toggleFlag = (cardId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  useEffect(() => {
    let ignore = false;
    if (deckId) {
      let fetchQueue: Promise<CardType[]>;

      if (drillMode === 'mistakes' && drillCardsParam) {
        const idList = drillCardsParam.split(',').filter(Boolean);
        fetchQueue = getDeckCards(deckId).then((all) =>
          all.filter((c) => idList.includes(c.id))
        );
      } else if (assessmentId) {
        fetchQueue = getDeckCards(deckId).then((allCards) =>
          getAssessmentCards(allCards, assessmentId)
        );
      } else {
        fetchQueue = getQueue(deckId, mode);
      }

        Promise.all([
          getDeck(deckId).catch(() => null),
          fetchQueue.catch(() => []),
          createSession(deckId, mode),
        ])
          .then(async ([deck, queue, sId]) => {
            if (!ignore) {
              let finalCards = queue;
              if (!finalCards || finalCards.length === 0) {
                const localCards = getLocalCustomCards(deckId);
                if (localCards.length > 0) {
                  finalCards = assessmentId
                    ? getAssessmentCards(localCards, assessmentId)
                    : localCards;
                } else {
                  const allDeckCards = await getDeckCards(deckId).catch(() => []);
                  if (allDeckCards.length > 0) {
                    finalCards = assessmentId
                      ? getAssessmentCards(allDeckCards, assessmentId)
                      : allDeckCards;
                  }
                }
              }

              const customDeck = getLocalCustomDecks().find((d) => d.id === deckId);
              const effectiveTitle = deck?.title || customDeck?.title || 'Study Deck';

              setDeckTitle(effectiveTitle);
              setCards(finalCards || []);
              setSessionId(sId);
              setCurrentIndex(0);
              setCorrectCount(0);
              setMissedCardIds([]);
              setFlaggedIds(new Set());
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
  }, [deckId, mode, assessmentId, drillMode, drillCardsParam]);

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

    const isCorrect = rating === 'good' || rating === 'easy';
    const updatedCorrect = isCorrect ? correctCount + 1 : correctCount;
    setCorrectCount(updatedCorrect);

    const updatedMissed = !isCorrect
      ? Array.from(new Set([...missedCardIds, currentCard.id]))
      : missedCardIds;
    if (!isCorrect) {
      setMissedCardIds(updatedMissed);
      recordMistake(currentCard, deckId, deckTitle);
    }

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
      if (assessmentId && drillMode !== 'mistakes') {
        saveAssessmentProgress(deckId, assessmentId, updatedCorrect, cards.length);
      }
      const missedQuery = updatedMissed.length > 0 ? `&missed=${updatedMissed.join(',')}` : '';
      const assessmentQuery = assessmentId ? `&assessment=${assessmentId}` : '';
      router.push(
        `/decks/${deckId}/review/summary?sessionId=${sessionId}${assessmentQuery}&correct=${updatedCorrect}&total=${cards.length}${missedQuery}`
      );
    } else {
      // Advance to next card
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setConfidenceBefore(undefined);
      setSelectedMcqOption(null);
      setIsRationaleOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
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
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-[var(--color-text)] mb-2">
          Review queue complete!
        </h2>
        <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mb-6">
          {mode === 'mastery'
            ? 'You have zero cards due for review right now. Switch to Cram mode to review anyway.'
            : 'No cards in this deck.'}
        </p>
        <div className="flex items-center gap-3">
          <Link href={`/decks/${deckId}`}>
            <Button variant="secondary" size="md">
              Back to Deck
            </Button>
          </Link>
          {mode === 'mastery' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleModeChange('cram')}
            >
              Cram All Cards
            </Button>
          )}
        </div>
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)] select-none">
      {/* Review Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Back button + Deck Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Link
              href={`/decks/${deckId}`}
              className="inline-flex items-center gap-1 text-[13px] sm:text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors shrink-0"
              aria-label="Back to deck overview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Deck</span>
            </Link>
            <span className="hidden sm:inline-block text-[13px] text-[var(--color-text-tertiary)] truncate max-w-[140px]">
              · {deckTitle}
            </span>
          </div>

          {/* Mode Switcher, Remediation Badge, or Assessment Info + Timer */}
          {drillMode === 'mistakes' ? (
            <Badge variant="accent" size="sm" className="font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px]">
              🎯 Remediation
            </Badge>
          ) : assessmentConfig ? (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Badge variant="accent" size="sm" className="font-semibold max-w-[105px] sm:max-w-none truncate text-[11px]">
                {assessmentConfig.title}
              </Badge>
              {isExam && (
                <button
                  type="button"
                  onClick={() => setTimerActive(!timerActive)}
                  className="px-2 py-0.5 rounded text-[11px] sm:text-[12px] font-mono font-bold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors shrink-0"
                  title="Click to pause or resume countdown"
                >
                  ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </button>
              )}
            </div>
          ) : (
            <ModeToggle mode={mode} onChange={handleModeChange} />
          )}

          {/* Question Flagging + Theme Toggle + Progress badge */}
          <div className="flex items-center gap-2">
            {cards[currentIndex] && (
              <button
                type="button"
                onClick={() => toggleFlag(cards[currentIndex].id)}
                className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all flex items-center gap-1 active:scale-95 ${
                  flaggedIds.has(cards[currentIndex].id)
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
                title="Flag this question for review"
              >
                <span>🚩</span>
                <span className="hidden sm:inline">
                  {flaggedIds.has(cards[currentIndex].id) ? 'Flagged' : 'Flag'}
                </span>
              </button>
            )}
            <ThemeToggle />
            <Badge variant="neutral" size="sm" className="font-mono">
              {currentIndex + 1} / {cards.length}
            </Badge>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-full h-1 bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-text)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Jump Navigator (for 35-item exam or multi-card reviews) */}
        {cards.length > 5 && (
          <div className="max-w-4xl mx-auto px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-[var(--color-border)] text-[11px]">
            <span className="text-[10px] uppercase font-bold text-[var(--color-text-tertiary)] shrink-0 mr-1">
              Jump:
            </span>
            {cards.map((c, i) => {
              const isCurrent = i === currentIndex;
              const isFlagged = flaggedIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(i);
                    setIsFlipped(false);
                    setSelectedMcqOption(null);
                    setIsRationaleOpen(false);
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-medium transition-all ${
                    isCurrent
                      ? 'bg-[var(--color-text)] text-[var(--color-bg)] font-bold shadow-sm'
                      : isFlagged
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                  title={`Question ${i + 1}${isFlagged ? ' (Flagged for Review)' : ''}`}
                >
                  {isFlagged ? '🚩' : i + 1}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Review Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-4xl mx-auto">
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
                className="text-[13px] text-[var(--color-text)] hover:opacity-80"
              >
                {selectedMcqOption !== null
                  ? 'Check Choice & Reveal (or press Space) →'
                  : 'Reveal Answer (or press Space) →'}
              </Button>
            </div>
          ) : (
            /* Post-reveal: Rating Buttons or Assessment Next */
            <div className="w-full animate-count-up space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {assessmentConfig ? 'Question Evaluation' : 'Rate difficulty (or swipe)'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRationaleOpen(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text)] hover:underline active:scale-95 transition-all"
                >
                  <span>💡 Explain Rationale (AI)</span>
                </button>
              </div>
              {assessmentConfig && selectedMcqOption !== null ? (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const currentCard = cards[currentIndex];
                      const chosen = currentCard?.options?.[selectedMcqOption] || '';
                      const isCorrect = chosen.trim().toLowerCase() === currentCard.back.trim().toLowerCase();
                      handleRate(isCorrect ? 'good' : 'again');
                    }}
                    className="w-full text-[14px] font-bold py-2.5 shadow-sm !bg-[var(--color-text)] !text-[var(--color-bg)]"
                  >
                    Next Question →
                  </Button>
                  <div className="pt-1">
                    <RatingButtons onRate={handleRate} />
                  </div>
                </div>
              ) : (
                <RatingButtons onRate={handleRate} />
              )}
            </div>
          )}
        </div>

        {cards[currentIndex] && (
          <AIRationaleModal
            card={cards[currentIndex]}
            chosenAnswer={
              selectedMcqOption !== null && cards[currentIndex].options
                ? cards[currentIndex].options[selectedMcqOption]
                : null
            }
            isOpen={isRationaleOpen}
            onClose={() => setIsRationaleOpen(false)}
          />
        )}
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
