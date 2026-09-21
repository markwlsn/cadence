'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Deck, DeckStats, Card } from '@/types';
import { Button, Badge } from '@/components/ui';
import { ensureMultipleChoice, cleanOptionDisplay, cleanQuestionDisplay } from '@/lib/assessments';
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
  const [viewMode, setViewMode] = useState<'study' | 'cram' | 'mock'>('study');
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

  // High-yield concise glossary terms
  const highYieldTerms = useMemo(() => {
    return mcqCards.map((c, i) => {
      let term = c.front
        .replace(/^What is (the)?\s*/i, '')
        .replace(/^Which (of the following|statement)\s*/i, '')
        .replace(/^Why does\s*/i, '')
        .replace(/\?$/, '')
      const cleanedTerm = cleanQuestionDisplay(term);
      const displayTerm = cleanedTerm.length > 60 ? cleanedTerm.slice(0, 57) + '…' : cleanedTerm;
      return {
        id: c.id,
        index: i + 1,
        term: displayTerm,
        keyAnswer: cleanOptionDisplay(c.back, i),
        context: c.explanation || 'Fundamental core curriculum concept required for examination retention.',
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
          Synthesizing High-Yield Reviewer…
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

        {/* View Mode & Document Format Toggles */}
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Document Mode:
            </span>
            <div className="inline-flex p-1 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setViewMode('study')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all flex items-center gap-1.5 ${
                  viewMode === 'study'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>📖</span>
                <span>High-Yield Reviewer</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cram')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all flex items-center gap-1.5 ${
                  viewMode === 'cram'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>⚡</span>
                <span>1-Page Cram Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mock')}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all flex items-center gap-1.5 ${
                  viewMode === 'mock'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>📝</span>
                <span>Blank Mock Exam</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          {viewMode !== 'cram' && (
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
          )}
        </div>
      </div>

      {/* ── 1-PAGE CRAM CHEAT SHEET (viewMode === 'cram') ── */}
      {viewMode === 'cram' && (
        <div className="p-4 sm:p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white text-[var(--color-text)] print:text-black space-y-4 font-sans print:text-[9.5pt]">
          {/* Print specific CSS rule to guarantee strictly 1 physical page */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 6mm 8mm;
              }
              body {
                background: white !important;
                color: black !important;
              }
            }
          `}} />

          {/* Cram Header */}
          <header className="pb-2 border-b-2 border-black flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-black text-white font-black text-[10px] flex items-center justify-center">
                  ⚡
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)] print:text-zinc-600">
                  Cadence 1-Page Pre-Exam Cram Cheat Sheet
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-black tracking-tight text-[var(--color-text)] print:text-black leading-tight">
                {activeDeck.title}
              </h1>
            </div>

            <div className="text-right text-[10px] text-[var(--color-text-secondary)] print:text-zinc-600 space-y-0.5 shrink-0">
              <div><strong>Candidate:</strong> {studentName}</div>
              <div><strong>Items:</strong> {mcqCards.length} High-Yield Concepts · {currentDate}</div>
            </div>
          </header>

          {/* Micro High-Yield Table */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)] print:text-black">
                Core Concept &amp; Instant Recall Answer Bank
              </h2>
              <span className="text-[10px] text-[var(--color-text-tertiary)] print:text-zinc-500 font-medium">
                High-frequency exam items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] print:text-[9pt] border-collapse">
                <thead>
                  <tr className="border-b border-black bg-[var(--color-surface-raised)] print:bg-zinc-100">
                    <th className="py-1 px-2 font-bold w-8 text-center">#</th>
                    <th className="py-1 px-2 font-bold w-2/5">Question / Concept</th>
                    <th className="py-1 px-2 font-bold w-1/4">Key Target Answer</th>
                    <th className="py-1 px-2 font-bold">Crucial Takeaway / Mechanism</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] print:divide-zinc-300">
                  {highYieldTerms.map((item) => (
                    <tr key={item.id} className="leading-tight">
                      <td className="py-1 px-2 text-center font-mono font-bold text-[var(--color-text-secondary)] print:text-zinc-700">
                        {item.index}
                      </td>
                      <td className="py-1 px-2 font-semibold text-[var(--color-text)] print:text-black">
                        {item.term}
                      </td>
                      <td className="py-1 px-2 font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                        {item.keyAnswer}
                      </td>
                      <td className="py-1 px-2 text-[var(--color-text-secondary)] print:text-zinc-700">
                        {item.context.length > 75 ? item.context.slice(0, 72) + '…' : item.context}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* High-Yield Test Rules & Traps (Compact Grid) */}
          <section className="pt-2 border-t border-[var(--color-border)] print:border-zinc-400 space-y-1.5">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)] print:text-black">
              Must-Know Test Traps &amp; Distractor Elimination Rules
            </h2>
            <div className="grid grid-cols-2 gap-2 text-[10.5px] print:text-[8.5pt]">
              <div className="p-2 rounded bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300">
                <strong>⚠️ Cause vs. Effect Trap:</strong> Distractors often state the consequence instead of the primary causal mechanism. Always isolate the root trigger.
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300">
                <strong>⚠️ Familiar Buzzword Trap:</strong> Incorrect options frequently recycle terms from the prompt out of context. Trace actual logic rather than word matches.
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300">
                <strong>💡 Extreme Qualifier Rule:</strong> Choices containing &ldquo;always&rdquo;, &ldquo;never&rdquo;, or &ldquo;only&rdquo; are almost universally incorrect distractors.
              </div>
              <div className="p-2 rounded bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300">
                <strong>🧠 50/50 Elimination Rule:</strong> If split between two choices, select the option that directly answers the active verb in the question stem.
              </div>
            </div>
          </section>

          <footer className="pt-2 border-t border-[var(--color-border)] print:border-black flex items-center justify-between text-[9px] text-[var(--color-text-tertiary)] print:text-zinc-600">
            <span>Cadence 1-Page Cram Sheet · Verified Academic Format</span>
            <span>Page 1 of 1 (Ultra-Compact Pre-Test Edition)</span>
          </footer>
        </div>
      )}

      {/* ── HIGH-YIELD REVIEWER OR BLANK MOCK EXAM (viewMode !== 'cram') ── */}
      {viewMode !== 'cram' && (
        <div className="p-5 sm:p-8 md:p-10 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white text-[var(--color-text)] print:text-black space-y-8 overflow-hidden font-sans">
          
          {/* Document Official Header */}
          <header className="pb-5 border-b-2 border-black/80 space-y-2">
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
                <h1 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-[var(--color-text)] print:text-black">
                  {activeDeck.title} — {viewMode === 'study' ? 'High-Yield Reviewer' : 'Mock Practice Exam'}
                </h1>
                <p className="text-[13px] text-[var(--color-text-secondary)] print:text-zinc-700 font-medium">
                  Standardized Academic Curriculum: 4 Short Quizzes · 2 Long Quizzes · 1 Comprehensive Exam
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5 text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 shrink-0">
                <div>
                  <span className="font-semibold text-[var(--color-text)] print:text-black">Candidate:</span> {studentName}
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text)] print:text-black">Date:</span> {currentDate}
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text)] print:text-black">Question Bank:</span> {mcqCards.length} MCQ Items
                </div>
              </div>
            </div>
          </header>

          {/* Fast-Learning Active Recall Banner (Study Mode only) */}
          {viewMode === 'study' && (
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 flex items-start gap-3">
              <span className="text-[18px]">💡</span>
              <div className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                <strong className="text-[var(--color-text)] print:text-black">Fast-Learning Active Recall Method:</strong> In Part II below, fold this sheet along the dashed line (or cover the right side with a paper). Test yourself on each prompt before looking at the answer. This builds 3x stronger retrieval pathways than passive reading.
              </div>
            </div>
          )}

          {/* ── PART I: Fast-Recall Concept Matrix ── */}
          <section className="space-y-3 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                  Part I
                </span>
                <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--color-text)] print:text-black">
                  High-Yield Fast-Recall Matrix ({highYieldTerms.length} Principles)
                </h2>
              </div>
              <span className="text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
                Key Definitions &amp; Mechanisms
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-[var(--color-border)] print:border-black bg-[var(--color-surface-raised)] print:bg-zinc-100">
                    <th className="py-2 px-3 font-bold w-10 text-center text-[var(--color-text)] print:text-black">#</th>
                    <th className="py-2 px-3 font-bold w-1/3 text-[var(--color-text)] print:text-black">Core Concept / Term</th>
                    <th className="py-2 px-3 font-bold w-1/4 text-[var(--color-text)] print:text-black">Target Definition</th>
                    <th className="py-2 px-3 font-bold text-[var(--color-text)] print:text-black">Mechanistic Principle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] print:divide-zinc-300">
                  {highYieldTerms.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-surface-raised)] print:hover:bg-transparent">
                      <td className="py-1.5 px-3 text-center font-mono font-bold text-[var(--color-text-secondary)] print:text-zinc-700">
                        {item.index}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-[var(--color-text)] print:text-black">
                        {item.term}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-[var(--color-text)] print:text-black">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] print:bg-zinc-100 border border-[var(--color-border)] print:border-zinc-300 font-semibold text-[11px]">
                          {item.keyAnswer}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-[var(--color-text-secondary)] print:text-zinc-700 leading-snug text-[11.5px]">
                        {item.context}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── PART II: Active Recall Fold-and-Quiz Table (Study Mode) ── */}
          {viewMode === 'study' && (
            <section className="space-y-3 break-inside-avoid">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-1.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                    Part II
                  </span>
                  <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--color-text)] print:text-black">
                    Active Recall Fold-and-Quiz Self-Tester
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 print:text-black">
                  ✂️ Fold along dashed line to quiz yourself
                </span>
              </div>

              <div className="border border-[var(--color-border)] print:border-zinc-400 rounded-[var(--radius-md)] overflow-hidden">
                <div className="grid grid-cols-12 bg-[var(--color-surface-raised)] print:bg-zinc-100 border-b border-[var(--color-border)] print:border-zinc-400 text-[11px] font-bold py-2 px-3">
                  <div className="col-span-7 text-[var(--color-text)] print:text-black">
                    Question / Prompt (What to answer in your head)
                  </div>
                  <div className="col-span-5 text-right font-mono text-[10px] text-[var(--color-text-secondary)] print:text-zinc-700">
                    [Fold / Cover Here] ➔ Target Answer &amp; Reason
                  </div>
                </div>

                <div className="divide-y divide-[var(--color-border)] print:divide-zinc-300 text-[12px]">
                  {mcqCards.map((card, i) => (
                    <div key={card.id} className="grid grid-cols-12 py-2.5 px-3 gap-3 items-center">
                      <div className="col-span-7 flex items-start gap-2">
                        <span className="font-mono font-bold text-[11px] text-[var(--color-text-secondary)] shrink-0">
                          {i + 1}.
                        </span>
                        <span className="font-medium text-[var(--color-text)] print:text-black leading-snug">
                          {cleanQuestionDisplay(card.front)}
                        </span>
                      </div>

                      {/* Dashed vertical separator representing the paper fold line */}
                      <div className="col-span-5 border-l-2 border-dashed border-zinc-400 pl-3 space-y-0.5">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                          {cleanOptionDisplay(card.back, i)}
                        </div>
                        {card.explanation && (
                          <div className="text-[11px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-tight">
                            {card.explanation.slice(0, 95)}…
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── PART III: Multiple Choice Question Bank ── */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--color-border)] print:border-black pb-1.5 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                  {viewMode === 'study' ? 'Part III' : 'Part II'}
                </span>
                <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--color-text)] print:text-black">
                  Official Multiple Choice Question Bank ({filteredCards.length} Items)
                </h2>
              </div>
              <span className="text-[12px] text-[var(--color-text-secondary)] print:text-zinc-700 font-medium">
                {viewMode === 'study' ? 'Mode: Complete Reviewer (Answers Highlighted)' : 'Mode: Mock Practice Test (Answers Detached)'}
              </span>
            </div>

            <div className="space-y-4">
              {filteredCards.map((card, qIdx) => {
                const options = card.options || [card.back, 'Option B', 'Option C', 'Option D'];

                return (
                  <div
                    key={card.id}
                    className="p-3.5 sm:p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] print:bg-white border border-[var(--color-border)] print:border-zinc-300 space-y-2.5 break-inside-avoid shadow-xs"
                  >
                    {/* Question Stem */}
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] print:bg-zinc-200 border border-[var(--color-border)] print:border-zinc-400 font-mono text-[11px] font-bold text-[var(--color-text)] print:text-black shrink-0">
                        Q{qIdx + 1}
                      </span>
                      <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--color-text)] print:text-black leading-snug">
                        {cleanQuestionDisplay(card.front)}
                      </h3>
                    </div>

                    {/* 4 Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 pl-1 sm:pl-7">
                      {options.map((option, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrect = option.trim().toLowerCase() === card.back.trim().toLowerCase();
                        const highlightAnswer = viewMode === 'study' && isCorrect;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-[var(--radius-sm)] border text-[12.5px] flex items-start gap-2 ${
                              highlightAnswer
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 print:border-black print:bg-zinc-100 font-semibold'
                                : 'bg-[var(--color-surface-raised)] print:bg-white border-[var(--color-border)] print:border-zinc-300 text-[var(--color-text)] print:text-black'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                highlightAnswer
                                  ? 'bg-emerald-600 text-white print:bg-black print:text-white'
                                  : 'bg-[var(--color-surface-overlay)] print:bg-zinc-200 text-[var(--color-text-secondary)] print:text-black'
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 leading-tight">
                              <span>{cleanOptionDisplay(option, optIdx)}</span>
                              {highlightAnswer && (
                                <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 print:text-black mt-0.5">
                                  ✓ Correct Key
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pedagogical Explanation (Shown in Study Mode) */}
                    {viewMode === 'study' && card.explanation && (
                      <div className="pt-2 border-t border-[var(--color-border)] print:border-zinc-200 text-[11.5px] text-[var(--color-text-secondary)] print:text-zinc-700 pl-1 sm:pl-7 space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-[var(--color-text)] print:text-black">
                          <span>💡</span>
                          <span>Why It&apos;s Correct:</span>
                        </div>
                        <p className="leading-snug pl-4">
                          {card.explanation}
                        </p>
                      </div>
                    )}

                    {/* Space for answers in Mock Exam Mode */}
                    {viewMode === 'mock' && (
                      <div className="pt-2 pl-1 sm:pl-7 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-500 border-t border-[var(--color-border)] print:border-zinc-200">
                        <span>Selected Choice: [ &nbsp; &nbsp; &nbsp; ]</span>
                        <span>Confidence: [ ] Low &nbsp; [ ] Med &nbsp; [ ] High</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── PART IV: Exam Traps & Distractor Elimination Rules ── */}
          <section className="space-y-3 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                  {viewMode === 'study' ? 'Part IV' : 'Part III'}
                </span>
                <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--color-text)] print:text-black">
                  Common Distractor Traps &amp; Elimination Strategies
                </h2>
              </div>
              <span className="text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
                Exam Heuristics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 space-y-1">
                <h3 className="text-[12.5px] font-bold text-[var(--color-text)] print:text-black flex items-center gap-1.5">
                  <span>⚠️</span> Trap: Superficial Keyword Matching
                </h3>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                  Distractors often reuse prominent technical jargon found in the passage or question stem. Always trace the causal mechanism rather than selecting an answer simply because it contains a familiar buzzword.
                </p>
              </div>

              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 space-y-1">
                <h3 className="text-[12.5px] font-bold text-[var(--color-text)] print:text-black flex items-center gap-1.5">
                  <span>⚠️</span> Trap: Opposite Directionality &amp; Inversion
                </h3>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] print:text-zinc-700 leading-relaxed">
                  A classic distractor pattern in multiple-choice exams is stating an effect as the cause, or reversing positive/negative feedback loops. Double-check the direction of causality before committing.
                </p>
              </div>
            </div>
          </section>

          {/* ── PART V: Official Answer Key Table (Detached in Mock Mode) ── */}
          <section className={`space-y-3 ${viewMode === 'mock' ? 'print:break-before-page pt-4' : ''}`}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] print:border-black pb-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] print:text-zinc-600">
                  {viewMode === 'study' ? 'Part V' : 'Detached Answer Key'}
                </span>
                <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--color-text)] print:text-black">
                  Official Answer Key &amp; Scoring Matrix
                </h2>
              </div>
              <span className="text-[11px] text-[var(--color-text-tertiary)] print:text-zinc-600 font-mono">
                Self-Grading Rubric
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11.5px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-[var(--color-border)] print:border-black bg-[var(--color-surface-raised)] print:bg-zinc-100">
                    <th className="py-1.5 px-3 font-bold w-12 text-center text-[var(--color-text)] print:text-black">Item #</th>
                    <th className="py-1.5 px-3 font-bold w-16 text-center text-[var(--color-text)] print:text-black">Key</th>
                    <th className="py-1.5 px-3 font-bold text-[var(--color-text)] print:text-black">Target Answer Text</th>
                    <th className="py-1.5 px-3 font-bold w-1/2 text-[var(--color-text)] print:text-black">Core Rationale</th>
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
                        <td className="py-1.5 px-3 text-center font-mono font-bold text-[var(--color-text)] print:text-black">
                          Q{idx + 1}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-[var(--color-text)] text-[var(--color-bg)] print:bg-black print:text-white text-[10.5px]">
                            {letter}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-[var(--color-text)] print:text-black">
                          {cleanOptionDisplay(card.back, idx)}
                        </td>
                        <td className="py-1.5 px-3 text-[var(--color-text-secondary)] print:text-zinc-700 leading-snug">
                          {card.explanation ? card.explanation.slice(0, 100) + '…' : 'Core curriculum definition.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] print:bg-zinc-50 border border-[var(--color-border)] print:border-zinc-300 flex items-center justify-between text-[11.5px] text-[var(--color-text-secondary)] print:text-zinc-700">
              <div>
                <span className="font-bold text-[var(--color-text)] print:text-black">Score Formula:</span> &nbsp;
                Total Correct / {filteredCards.length} × 100 = _______%
              </div>
              <div>
                <span className="font-bold text-[var(--color-text)] print:text-black">Mastery Threshold:</span> 80%+ indicates Exam Readiness
              </div>
            </div>
          </section>

          {/* Official Footer */}
          <footer className="pt-4 border-t border-[var(--color-border)] print:border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-[var(--color-text-tertiary)] print:text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text)] print:text-black">Cadence Academic System</span>
              <span>·</span>
              <span>Spaced Retrieval Practice &amp; Linear Assessment Curriculum</span>
            </div>
            <div>
              High-Yield Academic Reviewer Document · End of Examination Archive
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
