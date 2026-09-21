'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Deck, DeckStats, Card } from '@/types';
import { Button, Badge } from '@/components/ui';
import { ensureMultipleChoice, ASSESSMENT_CONFIGS } from '@/lib/assessments';
import { getCurrentUser } from '@/lib/auth';

import { getLocalCustomDecks, getLocalCustomCards } from '@/lib/data';

interface Props {
  deckId?: string;
  deck: Deck | null;
  stats?: DeckStats | null;
  cards?: Card[];
}

export default function ReviewerPdfClient({ deckId, deck, stats, cards = [] }: Props) {
  const [activeDeck, setActiveDeck] = useState<Deck | null>(deck);
  const [activeCards, setActiveCards] = useState<Card[]>(cards);
  const [viewMode, setViewMode] = useState<'study' | 'mock'>('study');
  const [strategyTab, setStrategyTab] = useState<'all' | 'cram' | 'mastery'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [studentName, setStudentName] = useState('Candidate Scholar');

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (user && !user.isGuest && user.name) {
      setStudentName(user.name);
    }

    if (!deck && deckId) {
      const customDecks = getLocalCustomDecks();
      const found = customDecks.find((d) => d.id === deckId);
      if (found) {
        setActiveDeck(found);
        const localCards = getLocalCustomCards(deckId);
        setActiveCards(localCards);
      }
    } else if (deck && deckId) {
      const localCards = getLocalCustomCards(deckId);
      if (localCards.length > 0 && cards.length === 0) {
        setActiveCards(localCards);
      }
    }
  }, [deck, deckId, cards]);

  // Standardize 100% of cards into 4-choice Multiple Choice format
  const mcqCards = useMemo(() => {
    return activeCards.map((c, idx) => ensureMultipleChoice(c, activeCards, idx));
  }, [activeCards]);

  // Filtered cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return mcqCards;
    const q = searchQuery.toLowerCase();
    return mcqCards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        (c.explanation && c.explanation.toLowerCase().includes(q))
    );
  }, [mcqCards, searchQuery]);

  // High-yield glossary terms
  const highYieldTerms = useMemo(() => {
    return mcqCards.map((c, i) => {
      // Extract concise concept name from question or back
      let term = c.front
        .replace(/^What is (the)?\s*/i, '')
        .replace(/^Which (of the following|statement)\s*/i, '')
        .replace(/^Why does\s*/i, '')
        .replace(/\?$/, '')
        .trim();
      if (term.length > 55) {
        term = term.slice(0, 52) + '…';
      }
      return {
        id: c.id,
        index: i + 1,
        term,
        keyAnswer: c.back,
        context: c.explanation || 'Key core curriculum concept required for examination retention.',
      };
    });
  }, [mcqCards]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      dateStyle: 'medium',
    });
  }, []);

  if (!mounted) {
    return (
      <div className="py-24 text-center">
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Synthesizing Comprehensive Reviewer PDF…
        </p>
      </div>
    );
  }

  if (!activeDeck) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[24px] flex items-center justify-center mx-auto">
          📄
        </div>
        <h2 className="text-[20px] font-bold text-[var(--color-text)]">
          Reviewer Deck Not Found
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
          The requested study deck was not found in your current session.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="secondary" size="md">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Screen Navigation & Customization Controls (Hidden on Print) ── */}
      <div className="p-4 sm:p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4 print:hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/decks/${activeDeck.id}`}
              className="text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Deck
            </Link>
            <span className="text-[var(--color-border)]">•</span>
            <span className="text-[13px] text-[var(--color-text-tertiary)] truncate max-w-[200px] sm:max-w-xs">
              {activeDeck.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 !bg-[var(--color-text)] !text-[var(--color-bg)] font-semibold shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* View Mode & Study Mode Toggles */}
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Document Format:
            </span>
            <div className="inline-flex p-1 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setViewMode('study')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all ${
                  viewMode === 'study'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                📖 Study Reviewer (With Answers &amp; Rationales)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mock')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all ${
                  viewMode === 'mock'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                📝 Blank Mock Practice Exam (For Paper Testing)
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts or questions…"
              className="w-full px-3 py-1.5 pl-8 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-text)]"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Official Printable Academic Document ── */}
      <div className="p-5 sm:p-8 md:p-12 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white text-[var(--color-text)] print:text-black space-y-10 overflow-hidden font-sans">
        
        {/* Document Official Header */}
        <header className="pb-6 border-b-2 border-black/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--color-text)] text-[var(--color-bg)] print:bg-black print:text-white font-black text-[11px]">
                  C
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)] print:text-zinc-600">
                  Cadence Academic Evaluation Engine · MCQ Standard
                </span>
              </div>
              <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[var(--color-text)] print:text-black">
                {activeDeck.title} — Comprehensive Reviewer &amp; Exam Bank
              </h1>
              <p className="text-[14px] text-[var(--color-text-secondary)] print:text-zinc-700 font-medium">
                Standardized Academic Curriculum: 4 Short Quizzes · 2 Long Quizzes · 1 Comprehensive Exam
              </p>
            </div>

            <div className="text-left sm:text-right space-y-0.5 text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 shrink-0">
              <div>
                <span className="font-semibold text-[var(--color-text)] print:text-black">Candidate:</span> {studentName}
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text)] print:text-black">Generated:</span> {currentDate}
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text)] print:text-black">Question Bank:</span> {mcqCards.length} Multiple Choice Items
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text)] print:text-black">Format:</span> 100% 4-Choice MCQ Standard
              </div>
            </div>
          </div>
        </header>

        {/* Study Methodology: Cram vs Mastery Guide */}
        <section className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--color-text)] print:text-black uppercase tracking-wider flex items-center gap-2">
              <span>🧭</span> Dual Study Methodology Guide: Cram Mode vs. Mastery Mode
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] print:bg-zinc-200 text-[var(--color-text)] print:text-black">
              Cadence Cognitive Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cram Mode Strategy */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] print:bg-white border border-[var(--color-border)] print:border-zinc-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">⚡</span>
                <h3 className="text-[14px] font-bold text-[var(--color-text)] print:text-black">
                  Cram Mode Protocol (Exam T-48h to T-0h)
                </h3>
              </div>
              <p className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                <strong>Goal:</strong> Rapid working-memory consolidation and high-frequency active recall under time compression.
              </p>
              <ul className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 space-y-1 list-disc list-inside">
                <li>Review <strong>Part I (High-Yield Cheat Sheet)</strong> for 10 minutes to imprint key terminology.</li>
                <li>Drill through <strong>Part III (MCQ Bank)</strong> with immediate rationale inspection on missed items.</li>
                <li>Cards with low retrieval stability are prioritized automatically by Cadence.</li>
              </ul>
            </div>

            {/* Mastery Mode Strategy */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] print:bg-white border border-[var(--color-border)] print:border-zinc-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">🧠</span>
                <h3 className="text-[14px] font-bold text-[var(--color-text)] print:text-black">
                  Mastery Mode Protocol (Long-Term Retention)
                </h3>
              </div>
              <p className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                <strong>Goal:</strong> Durable neurological consolidation via Free Spaced Repetition Scheduling (FSRS).
              </p>
              <ul className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 space-y-1 list-disc list-inside">
                <li>Follow the linear curriculum: <strong>Quiz 1 &rarr; 2 &rarr; 3 &rarr; 4</strong> (Foundational milestones).</li>
                <li>Integrate knowledge via <strong>Long Quiz 1 &amp; 2</strong> (Synthesis reviews).</li>
                <li>Test exam readiness with the <strong>35-Item Comprehensive Exam</strong> (target 85%+ score).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── PART I: High-Yield Cheat Sheet & Key Terminology ── */}
        <section className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                Part I
              </span>
              <h2 className="text-[18px] font-bold text-[var(--color-text)] print:text-black">
                High-Yield Quick-Reference Cheat Sheet ({highYieldTerms.length} Core Principles)
              </h2>
            </div>
            <span className="text-[12px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
              Key Terminology &amp; Mechanics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)] print:border-black bg-[var(--color-surface-raised)] print:bg-zinc-100">
                  <th className="py-2.5 px-3 font-bold w-12 text-center text-[var(--color-text)] print:text-black">#</th>
                  <th className="py-2.5 px-3 font-bold w-1/3 text-[var(--color-text)] print:text-black">Core Concept / Term</th>
                  <th className="py-2.5 px-3 font-bold w-1/3 text-[var(--color-text)] print:text-black">Target Definition / Correct Answer</th>
                  <th className="py-2.5 px-3 font-bold text-[var(--color-text)] print:text-black">Mechanistic Principle &amp; Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] print:divide-zinc-300">
                {highYieldTerms.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-surface-raised)] print:hover:bg-transparent">
                    <td className="py-2 px-3 text-center font-mono font-bold text-[var(--color-text-secondary)] print:text-zinc-700">
                      {item.index}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[var(--color-text)] print:text-black">
                      {item.term}
                    </td>
                    <td className="py-2 px-3 font-medium text-[var(--color-text)] print:text-black">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] print:bg-zinc-100 border border-[var(--color-border)] print:border-zinc-300 font-semibold">
                        {item.keyAnswer}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                      {item.context}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PART II: Detailed Concept Breakdowns ── */}
        <section className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                Part II
              </span>
              <h2 className="text-[18px] font-bold text-[var(--color-text)] print:text-black">
                In-Depth Conceptual Breakdowns &amp; System Dynamics
              </h2>
            </div>
            <span className="text-[12px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
              Deep Mechanism Notes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mcqCards.slice(0, 10).map((card, idx) => (
              <div
                key={card.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-white border border-[var(--color-border)] print:border-zinc-300 space-y-2 break-inside-avoid"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[var(--color-text)] text-[var(--color-bg)] print:bg-black print:text-white text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-[13px] font-bold text-[var(--color-text)] print:text-black leading-snug">
                    {card.front}
                  </h3>
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 pl-7 space-y-1 leading-relaxed">
                  <p>
                    <strong className="text-[var(--color-text)] print:text-black">Correct Key:</strong> {card.back}
                  </p>
                  {card.explanation && (
                    <p className="text-[11px] opacity-90 border-l-2 border-[var(--color-border-strong)] print:border-black pl-2 mt-1 italic">
                      {card.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PART III: 100% Multiple Choice Exam Bank ── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--color-border)] print:border-black pb-2 gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                Part III
              </span>
              <h2 className="text-[18px] font-bold text-[var(--color-text)] print:text-black">
                Official Multiple Choice Question Bank ({filteredCards.length} Questions)
              </h2>
            </div>
            <span className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 font-medium">
              {viewMode === 'study' ? 'Mode: Complete Reviewer (Answers Shown)' : 'Mode: Mock Practice Test (Answers Detached)'}
            </span>
          </div>

          <div className="space-y-5">
            {filteredCards.map((card, qIdx) => {
              const options = card.options || [card.back, 'Option B', 'Option C', 'Option D'];

              return (
                <div
                  key={card.id}
                  className="p-4 sm:p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] print:bg-white border border-[var(--color-border)] print:border-zinc-300 space-y-3 break-inside-avoid shadow-xs"
                >
                  {/* Question Stem */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] print:bg-zinc-200 border border-[var(--color-border)] print:border-zinc-400 font-mono text-[12px] font-bold text-[var(--color-text)] print:text-black shrink-0">
                      Q{qIdx + 1}
                    </span>
                    <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--color-text)] print:text-black leading-relaxed">
                      {card.front}
                    </h3>
                  </div>

                  {/* 4 Multiple Choice Options (A, B, C, D) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1 sm:pl-8">
                    {options.map((option, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = option.trim().toLowerCase() === card.back.trim().toLowerCase();
                      const highlightAnswer = viewMode === 'study' && isCorrect;

                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-[var(--radius-sm)] border text-[13px] transition-all flex items-start gap-2.5 ${
                            highlightAnswer
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 print:border-black print:bg-zinc-100 font-semibold'
                              : 'bg-[var(--color-surface-raised)] print:bg-white border-[var(--color-border)] print:border-zinc-300 text-[var(--color-text)] print:text-black'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                              highlightAnswer
                                ? 'bg-emerald-600 text-white print:bg-black print:text-white'
                                : 'bg-[var(--color-surface-overlay)] print:bg-zinc-200 text-[var(--color-text-secondary)] print:text-black'
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="flex-1 leading-snug">
                            <span>{option}</span>
                            {highlightAnswer && (
                              <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 print:text-black mt-0.5">
                                ✓ Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pedagogical Explanation & Distractor Analysis (Shown in Study Mode) */}
                  {viewMode === 'study' && card.explanation && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--color-border)] print:border-zinc-200 text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 pl-1 sm:pl-8 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)] print:text-black">
                        <span>💡</span>
                        <span>Pedagogical Rationale:</span>
                      </div>
                      <p className="leading-relaxed pl-5">
                        {card.explanation}
                      </p>
                    </div>
                  )}

                  {/* Space for notes in Mock Exam Mode */}
                  {viewMode === 'mock' && (
                    <div className="pt-2 pl-1 sm:pl-8 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-500 border-t border-[var(--color-border)] print:border-zinc-200">
                      <span>Selected Answer: [ &nbsp; &nbsp; &nbsp; ]</span>
                      <span>Confidence: [ ] Low &nbsp; [ ] Med &nbsp; [ ] High</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PART IV: Common Traps & Distractor Misconceptions ── */}
        <section className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                Part IV
              </span>
              <h2 className="text-[18px] font-bold text-[var(--color-text)] print:text-black">
                Common Traps &amp; Distractor Elimination Strategies
              </h2>
            </div>
            <span className="text-[12px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
              Exam Heuristics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 space-y-1.5">
              <h3 className="text-[13px] font-bold text-[var(--color-text)] print:text-black flex items-center gap-1.5">
                <span>⚠️</span> Trap: Superficial Keyword Matching
              </h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                Distractors often reuse prominent technical jargon found in the passage or question stem. Always trace the causal mechanism rather than selecting an answer simply because it contains a familiar buzzword.
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 space-y-1.5">
              <h3 className="text-[13px] font-bold text-[var(--color-text)] print:text-black flex items-center gap-1.5">
                <span>⚠️</span> Trap: Opposite Directionality &amp; Inversion
              </h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                A classic distractor pattern in multiple-choice exams is stating an effect as the cause, or reversing positive/negative feedback loops. Double-check the direction of causality before committing.
              </p>
            </div>
          </div>
        </section>

        {/* ── PART V: Official Answer Key & Scoring Table (Detached in Mock Mode) ── */}
        <section className={`space-y-4 ${viewMode === 'mock' ? 'print:break-before-page pt-6' : ''}`}>
          <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                Part V
              </span>
              <h2 className="text-[18px] font-bold text-[var(--color-text)] print:text-black">
                Official Answer Key &amp; Scoring Matrix
              </h2>
            </div>
            <span className="text-[12px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
              Self-Grading Rubric
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)] print:border-black bg-[var(--color-surface-raised)] print:bg-zinc-100">
                  <th className="py-2 px-3 font-bold w-14 text-center text-[var(--color-text)] print:text-black">Item #</th>
                  <th className="py-2 px-3 font-bold w-20 text-center text-[var(--color-text)] print:text-black">Key</th>
                  <th className="py-2 px-3 font-bold text-[var(--color-text)] print:text-black">Target Answer Text</th>
                  <th className="py-2 px-3 font-bold w-1/2 text-[var(--color-text)] print:text-black">Core Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] print:divide-zinc-300">
                {filteredCards.map((card, idx) => {
                  const options = card.options || [card.back];
                  const correctIndex = options.findIndex(
                    (opt) => opt.trim().toLowerCase() === card.back.trim().toLowerCase()
                  );
                  const letter = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';

                  return (
                    <tr key={card.id} className="hover:bg-[var(--color-surface-raised)] print:hover:bg-transparent">
                      <td className="py-2 px-3 text-center font-mono font-bold text-[var(--color-text)] print:text-black">
                        Q{idx + 1}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-[var(--color-text)] text-[var(--color-bg)] print:bg-black print:text-white text-[11px]">
                          {letter}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-[var(--color-text)] print:text-black">
                        {card.back}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-secondary)] print:text-zinc-700 leading-snug">
                        {card.explanation ? card.explanation.slice(0, 110) + '…' : 'Core curriculum definition.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 flex items-center justify-between text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700">
            <div>
              <span className="font-bold text-[var(--color-text)] print:text-black">Score Calculation:</span> &nbsp;
              Total Correct / {filteredCards.length} × 100 = _______%
            </div>
            <div>
              <span className="font-bold text-[var(--color-text)] print:text-black">Readiness Threshold:</span> 80%+ indicates Mastery
            </div>
          </div>
        </section>

        {/* Official Footer */}
        <footer className="pt-6 border-t border-[var(--color-border)] print:border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--color-text)] print:text-black">Cadence Academic System</span>
            <span>·</span>
            <span>Spaced Retrieval Practice &amp; Linear Assessment Engine</span>
          </div>
          <div>
            End of Official Reviewer Document · Page 1 of Reviewer Archive
          </div>
        </footer>
      </div>
    </div>
  );
}
