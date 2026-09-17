'use client';

import React, { useRef, useState } from 'react';
import type { Card as CardType, Rating } from '@/types';
import { FlashCard } from './FlashCard';

interface CardStackProps {
  cards: CardType[];
  currentIndex: number;
  isFlipped: boolean;
  onFlip: () => void;
  onSwipe: (rating: Rating) => void;
  selectedMcqOption?: number | null;
  onSelectMcqOption?: (index: number) => void;
}

export function CardStack({
  cards,
  currentIndex,
  isFlipped,
  onFlip,
  onSwipe,
  selectedMcqOption,
  onSelectMcqOption,
}: CardStackProps) {
  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  // Drag / Swipe tracking
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const SWIPE_THRESHOLD = 90;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only ignore drag if clicking inner buttons/links/inputs/textareas/code
    const interactive = (e.target as HTMLElement).closest('button, a, input, textarea, select, label, pre, code');
    if (interactive) {
      return;
    }
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already lost
    }

    if (dragOffset.x < -SWIPE_THRESHOLD) {
      // Swiped Left -> Again
      onSwipe('again');
    } else if (dragOffset.x > SWIPE_THRESHOLD) {
      // Swiped Right -> Easy
      onSwipe('easy');
    }
    setDragOffset({ x: 0, y: 0 });
  };

  if (!currentCard) return null;

  // Calculate rotation and opacity during drag
  const rotation = dragOffset.x * 0.08;
  const swipeOpacity = Math.max(0.6, 1 - Math.abs(dragOffset.x) / 400);

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[440px] sm:min-h-[490px] h-[450px] sm:h-[490px] flex items-center justify-center">
      {/* Background card peek to convey stack depth */}
      {nextCard && (
        <div
          aria-hidden="true"
          className="absolute inset-0 top-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] scale-[0.96] opacity-70 pointer-events-none transition-transform"
        />
      )}

      {/* Swipe Direction Indicators */}
      {isDragging && (
        <>
          <div
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-30 px-3 py-1.5 rounded-full bg-[var(--color-rating-again)] text-white text-[13px] font-bold shadow-md transition-opacity ${
              dragOffset.x < -30 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            ← Again
          </div>
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-30 px-3 py-1.5 rounded-full bg-[var(--color-rating-easy)] text-white text-[13px] font-bold shadow-md transition-opacity ${
              dragOffset.x > 30 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Easy →
          </div>
        </>
      )}

      {/* Active Top Card */}
      <div
        className="relative z-10 w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setIsDragging(false);
          setDragOffset({ x: 0, y: 0 });
        }}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.4}px, 0) rotate(${rotation}deg)`,
          opacity: isDragging ? swipeOpacity : 1,
          transition: isDragging ? 'none' : 'transform 0.25s var(--ease-standard), opacity 0.25s',
        }}
      >
        <FlashCard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={onFlip}
          selectedMcqOption={selectedMcqOption}
          onSelectMcqOption={onSelectMcqOption}
        />
      </div>
    </div>
  );
}
