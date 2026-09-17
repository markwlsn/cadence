'use client';

import React from 'react';
import type { Card as CardType } from '@/types';
import { Badge } from '@/components/ui';

interface FlashCardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
  selectedMcqOption?: number | null;
  onSelectMcqOption?: (index: number) => void;
}

export function FlashCard({
  card,
  isFlipped,
  onFlip,
  selectedMcqOption,
  onSelectMcqOption,
}: FlashCardProps) {
  // Render helper for cloze cards
  const renderCloze = (text: string, reveal: boolean) => {
    // Matches {{c1::hidden text}}
    const parts = text.split(/(\{\{c\d+::.*?\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/\{\{c\d+::(.*?)\}\}/);
      if (match) {
        const hiddenContent = match[1];
        if (reveal) {
          return (
            <span
              key={index}
              className="text-[var(--color-accent)] font-semibold border-b-2 border-[var(--color-accent)] px-0.5"
            >
              {hiddenContent}
            </span>
          );
        }
        return (
          <span
            key={index}
            className="inline-block px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-accent)] font-mono text-[14px] mx-1 select-none"
          >
            [ ... ]
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className="card-flip-container w-full h-[360px] sm:h-[420px] cursor-pointer select-none"
      onClick={() => {
        if (!isFlipped) onFlip();
      }}
      role="button"
      tabIndex={0}
      aria-label={`Flashcard: ${isFlipped ? 'Answer side' : 'Question side'}. Tap or press enter to flip.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isFlipped) onFlip();
        }
      }}
    >
      <div className={`card-flip-inner h-full w-full ${isFlipped ? 'is-flipped' : ''}`}>
        {/* Front Side */}
        <div className="card-flip-front h-full w-full p-6 sm:p-8 flex flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between">
            <Badge variant="neutral" size="sm" className="capitalize">
              {card.type}
            </Badge>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Tap anywhere to flip
            </span>
          </div>

          <div className="my-auto flex flex-col items-center justify-center text-center px-2 sm:px-4">
            {card.type === 'cloze' ? (
              <p className="text-[20px] sm:text-[24px] font-medium leading-relaxed text-[var(--color-text)]">
                {renderCloze(card.front, false)}
              </p>
            ) : (
              <p className="text-[20px] sm:text-[24px] font-medium leading-relaxed text-[var(--color-text)]">
                {card.front}
              </p>
            )}

            {/* MCQ Choices (interactive if not yet flipped) */}
            {card.type === 'mcq' && card.options && (
              <div
                className="grid grid-cols-1 gap-2 w-full max-w-md mt-6"
                onClick={(e) => e.stopPropagation()}
              >
                {card.options.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectMcqOption?.(idx);
                      if (!isFlipped) onFlip();
                    }}
                    className={[
                      'w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] border text-[15px]',
                      'transition-all duration-[var(--duration-fast)] flex items-center justify-between',
                      selectedMcqOption === idx
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
                    ].join(' ')}
                  >
                    <span>{option}</span>
                    <span className="text-[12px] opacity-60 font-mono">
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="text-[13px] font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1">
              Reveal Answer
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </span>
          </div>
        </div>

        {/* Back Side */}
        <div className="card-flip-back h-full w-full p-6 sm:p-8 flex flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <Badge variant="accent" size="sm">
              Answer
            </Badge>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Rate your recall below
            </span>
          </div>

          <div className="my-auto flex flex-col items-center justify-center text-center px-2 sm:px-4 py-4">
            <div className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-text)] leading-relaxed mb-3">
              {card.type === 'cloze' ? renderCloze(card.back, true) : card.back}
            </div>

            {card.explanation && (
              <div className="mt-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] sm:text-[15px] leading-relaxed text-[var(--color-text-secondary)] text-left w-full max-w-lg">
                <p className="font-semibold text-[var(--color-text)] text-[12px] uppercase tracking-wide mb-1">
                  Explanation
                </p>
                {card.explanation}
              </div>
            )}
          </div>

          <div className="h-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
