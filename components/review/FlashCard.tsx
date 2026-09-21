'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card as CardType } from '@/types';
import { Badge, Button } from '@/components/ui';
import { evaluateStudentAnswer } from '@/lib/utils/levenshtein';

interface FlashCardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
  selectedMcqOption?: number | null;
  onSelectMcqOption?: (index: number) => void;
}

interface ClozePart {
  text: string;
  isBlank: boolean;
}

/** Check whether text has code blocks, programming keywords, or syntax structures */
function isCodeSnippet(text: string): boolean {
  if (!text) return false;
  if (text.includes('```')) return true;
  const lines = text.split('\n');
  const codeIndicators = [
    /\b(def|function|class|const|let|var|return|import|export|public|private|static|void|int|float|double|String|boolean)\b/,
    /[{};]/,
    /=>/,
    /\b(console\.log|print\(|System\.out)\b/,
    /\b(if\s*\(|for\s*\(|while\s*\(|elif\b|else:)/,
  ];
  const matchedLines = lines.filter((line) => codeIndicators.some((regex) => regex.test(line)));
  return matchedLines.length >= 2 || (lines.length > 1 && matchedLines.length >= 1) || text.includes(';');
}

/** Strip markdown code block wrapper if present */
function cleanCodeText(text: string): string {
  return text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '');
}

/** Normalize strings for comparing student answer with expected answer */
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/[.,;:!?]+$/, '')
    .replace(/\s+/g, ' ');
}

/** Clean up raw table-of-contents dots, citations, and numbers from option displays */
export function cleanOptionDisplay(text: string): string {
  if (!text) return '';
  return text
    .replace(/\.{2,}/g, '') // strip trailing dotted leaders like .......
    .replace(/\[\d+\]|\(\d+\)/g, '') // strip trailing [1] or (1) citations
    .replace(/^[-*•\d.)]+\s*/, '') // strip leading bullet numbers
    .trim();
}

/** Clean up raw table-of-contents dots and citations from question stems */
export function cleanQuestionDisplay(text: string): string {
  if (!text) return '';
  return text
    .replace(/\.{3,}/g, '')
    .replace(/\[\d+\]|\(\d+\)/g, '')
    .trim();
}

/** Check if student cloze input matches expected answer (including code spacing tolerance) */
function checkAnswerMatch(typed: string, expected: string): boolean {
  const normTyped = normalizeText(typed);
  const normExpected = normalizeText(expected);
  if (!normTyped || !normExpected) return false;
  if (normTyped === normExpected) return true;
  // Code tolerance: ignoring spaces between operators/symbols
  if (normTyped.replace(/\s+/g, '') === normExpected.replace(/\s+/g, '')) return true;
  return false;
}

/** Parse front text and return cloze parts along with target answer */
function parseCloze(front: string, back: string): { parts: ClozePart[]; expectedAnswer: string } {
  const cleanFront = cleanCodeText(front);

  // 1. Check for {{blank}} syntax
  if (cleanFront.includes('{{blank}}')) {
    const rawParts = cleanFront.split('{{blank}}');
    const parts: ClozePart[] = [];
    rawParts.forEach((part, i) => {
      parts.push({ text: part, isBlank: false });
      if (i < rawParts.length - 1) {
        parts.push({ text: '', isBlank: true });
      }
    });
    return { parts, expectedAnswer: back.trim() };
  }

  // 2. Check for {{c1::term}} Anki syntax
  if (/\{\{c\d+::.*?\}\}/.test(cleanFront)) {
    const splitTokens = cleanFront.split(/(\{\{c\d+::.*?\}\})/g);
    const parts: ClozePart[] = [];
    let extractedAnswer = back.trim();

    splitTokens.forEach((token) => {
      const match = token.match(/\{\{c\d+::(.*?)\}\}/);
      if (match) {
        if (!extractedAnswer) extractedAnswer = match[1].trim();
        parts.push({ text: '', isBlank: true });
      } else if (token) {
        parts.push({ text: token, isBlank: false });
      }
    });
    return { parts, expectedAnswer: extractedAnswer || back.trim() };
  }

  // 3. Check for [ ... ] or ___ underscores
  if (/\[\s*\.\.\.\s*\]|_{3,}/.test(cleanFront)) {
    const splitTokens = cleanFront.split(/(\[\s*\.\.\.\s*\]|_{3,})/g);
    const parts: ClozePart[] = [];
    splitTokens.forEach((token) => {
      if (/^\[\s*\.\.\.\s*\]$|^_{3,}$/.test(token)) {
        parts.push({ text: '', isBlank: true });
      } else if (token) {
        parts.push({ text: token, isBlank: false });
      }
    });
    return { parts, expectedAnswer: back.trim() };
  }

  // Fallback
  return {
    parts: [
      { text: cleanFront, isBlank: false },
      { text: '', isBlank: true },
    ],
    expectedAnswer: back.trim(),
  };
}

/** Render text with inline markdown code formatting like `var` */
function renderFormattedInlineText(text: string) {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] font-mono text-[0.88em] text-[var(--color-text)] font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function FlashCard({
  card,
  isFlipped,
  onFlip,
  selectedMcqOption,
  onSelectMcqOption,
}: FlashCardProps) {
  // Cloze interactive states
  const [clozeInput, setClozeInput] = useState('');
  const [clozeStatus, setClozeStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [clozeFeedback, setClozeFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  // Basic open question interactive answer box
  const [basicAnswer, setBasicAnswer] = useState('');

  // Reset inputs when card changes
  useEffect(() => {
    setClozeInput('');
    setClozeStatus('idle');
    setClozeFeedback('');
    setShowHint(false);
    setBasicAnswer('');
  }, [card.id]);

  const isCode = useMemo(() => isCodeSnippet(card.front), [card.front]);
  const clozeData = useMemo(() => parseCloze(card.front, card.back), [card.front, card.back]);

  const handleCheckCloze = useCallback(() => {
    if (!clozeInput.trim()) return;
    const result = evaluateStudentAnswer(clozeInput, clozeData.expectedAnswer);
    if (result.isMatch) {
      setClozeStatus('correct');
      if (result.matchType === 'typo') {
        setClozeFeedback(`Almost! ${result.message || 'Minor typo'} — counted as correct!`);
      } else {
        setClozeFeedback('Spot on! Excellent active recall.');
      }
    } else {
      setClozeStatus('incorrect');
      setClozeFeedback('Not quite! Check the hint or try again.');
    }
  }, [clozeInput, clozeData.expectedAnswer]);

  const handleSelectMcq = useCallback(
    (index: number) => {
      onSelectMcqOption?.(index);
    },
    [onSelectMcqOption]
  );

  // Keyboard shortcut for MCQ options: 1-4 or A-D when card is on front
  useEffect(() => {
    if (card.type !== 'mcq' || isFlipped || !card.options) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      const key = e.key.toLowerCase();
      const keyMap: Record<string, number> = {
        '1': 0,
        a: 0,
        '2': 1,
        b: 1,
        '3': 2,
        c: 2,
        '4': 3,
        d: 3,
      };
      if (key in keyMap && card.options && keyMap[key] < card.options.length) {
        e.preventDefault();
        handleSelectMcq(keyMap[key]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card.type, isFlipped, card.options, handleSelectMcq]);

  // Is the chosen MCQ option correct?
  const isMcqCorrect = useMemo(() => {
    if (selectedMcqOption === null || selectedMcqOption === undefined || !card.options) return null;
    const chosenText = card.options[selectedMcqOption];
    return normalizeText(chosenText || '') === normalizeText(card.back || '');
  }, [selectedMcqOption, card.options, card.back]);

  return (
    <div
      className="card-flip-container w-full min-h-[420px] sm:min-h-[500px] h-auto cursor-pointer select-none"
      onClick={() => {
        if (!isFlipped) onFlip();
      }}
      role={isFlipped ? 'region' : 'button'}
      tabIndex={0}
      aria-label={`Flashcard: ${isFlipped ? 'Answer side' : 'Question side'}. Tap or press space to flip.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // If active in an input/textarea, don't trigger flip
          if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
            return;
          }
          e.preventDefault();
          if (!isFlipped) onFlip();
        }
      }}
    >
      <div className={`card-flip-inner min-h-[420px] sm:min-h-[500px] h-full w-full ${isFlipped ? 'is-flipped' : ''}`}>
        {/* ─── Front Side ─────────────────────────────────────────────────── */}
        <div className="card-flip-front min-h-[420px] sm:min-h-[500px] h-full w-full p-5 sm:p-8 flex flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-y-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="sm" className="capitalize">
                {card.type === 'cloze' && isCode ? 'Code Blank' : card.type}
              </Badge>
              {isCode && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]">
                  Code
                </span>
              )}
            </div>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              {isFlipped ? 'Answer revealed' : 'Tap anywhere or Space to flip'}
            </span>
          </div>

          {/* Question / Prompt Body */}
          <div className="my-auto flex flex-col items-center justify-center text-center w-full max-w-2xl sm:max-w-3xl mx-auto py-2">
            {/* 1. CLOZE / FILL IN THE BLANK */}
            {card.type === 'cloze' && (
              <div className="w-full flex flex-col items-center">
                {isCode ? (
                  /* Code Window with embedded blank input */
                  <div className="w-full text-left rounded-xl overflow-hidden border border-[#333333] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] sm:text-[14px] shadow-md my-2">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-[#252526] border-b border-[#333333] select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="text-[11px] text-[#858585] uppercase tracking-wider font-semibold">
                        Fill in the Code Blank
                      </span>
                      <span className="w-8" />
                    </div>

                    <pre className="p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {clozeData.parts.map((part, index) => {
                        if (part.isBlank) {
                          return (
                            <input
                              key={`blank-${index}`}
                              type="text"
                              value={clozeInput}
                              onChange={(e) => {
                                setClozeInput(e.target.value);
                                setClozeStatus('idle');
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                  handleCheckCloze();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              placeholder="___"
                              className={[
                                'inline-block px-2.5 py-0.5 mx-1 font-mono text-[13px] sm:text-[14px] rounded border transition-all',
                                'min-w-[110px] max-w-[280px] text-center focus:outline-none focus:ring-2 shadow-inner',
                                clozeStatus === 'correct'
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50'
                                  : clozeStatus === 'incorrect'
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-2 ring-rose-500/50'
                                  : 'bg-[#2d2d30] border-[#007acc] text-[#9cdcfe] focus:ring-[#007acc]',
                              ].join(' ')}
                            />
                          );
                        }
                        return <span key={`code-${index}`}>{part.text}</span>;
                      })}
                    </pre>
                  </div>
                ) : (
                  /* Standard Sentence Cloze */
                  <p className="text-[18px] sm:text-[21px] font-medium leading-relaxed text-[var(--color-text)] my-2">
                    {clozeData.parts.map((part, index) => {
                      if (part.isBlank) {
                        return (
                          <input
                            key={`blank-${index}`}
                            type="text"
                            value={clozeInput}
                            onChange={(e) => {
                              setClozeInput(e.target.value);
                              setClozeStatus('idle');
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                handleCheckCloze();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="type answer..."
                            className={[
                              'inline-block px-3 py-1 mx-1.5 text-[16px] sm:text-[18px] font-semibold rounded-lg border-2 transition-all',
                              'min-w-[130px] max-w-[240px] text-center focus:outline-none focus:ring-2 shadow-sm',
                              clozeStatus === 'correct'
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                                : clozeStatus === 'incorrect'
                                ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30'
                                : 'bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text)] focus:border-[var(--color-text)] focus:ring-[var(--color-focus-ring)]',
                            ].join(' ')}
                          />
                        );
                      }
                      return <span key={`text-${index}`}>{part.text}</span>;
                    })}
                  </p>
                )}

                {/* Cloze Action & Feedback Bar */}
                <div
                  className="w-full max-w-md flex flex-col items-center gap-2 mt-3"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-2 w-full flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCheckCloze}
                      className="px-4 text-[13px] font-semibold"
                    >
                      Check Answer (↵)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowHint((prev) => !prev)}
                      className="text-[12px] px-3 font-medium"
                    >
                      💡 {showHint ? 'Hide Hint' : 'Hint'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onFlip}
                      className="text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                    >
                      Reveal Answer →
                    </Button>
                  </div>

                  {/* Hint Display */}
                  {showHint && (
                    <div className="text-[12px] text-[var(--color-text)] bg-[var(--color-surface-overlay)] px-3 py-1.5 rounded-lg border border-[var(--color-border)] animate-count-up">
                      💡 <strong>Hint:</strong> Starts with <strong>&quot;{clozeData.expectedAnswer.charAt(0).toUpperCase()}&quot;</strong> · {clozeData.expectedAnswer.length} characters
                    </div>
                  )}

                  {clozeStatus === 'correct' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[13px] font-medium animate-count-up">
                      <span>✓ {clozeFeedback || 'Correct! Great recall. Tap card to view explanation.'}</span>
                    </div>
                  )}
                  {clozeStatus === 'incorrect' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[13px] font-medium animate-count-up">
                      <span>✗ {clozeFeedback || 'Not quite. Try again or click Reveal Answer!'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. MCQ (MULTIPLE CHOICE) */}
            {card.type === 'mcq' && (
              <div className="w-full flex flex-col items-center">
                <div className="text-[18px] sm:text-[22px] font-semibold leading-relaxed text-[var(--color-text)] mb-3 max-w-2xl">
                  {isCode ? (
                    <div className="text-left rounded-xl overflow-hidden border border-[#333333] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] sm:text-[14px] p-4 my-2">
                      <pre className="whitespace-pre-wrap leading-relaxed">{cleanCodeText(card.front)}</pre>
                    </div>
                  ) : (
                    renderFormattedInlineText(cleanQuestionDisplay(card.front))
                  )}
                </div>

                {card.options && (
                  <div
                    className="grid grid-cols-1 gap-2.5 sm:gap-3 w-full max-w-2xl sm:max-w-3xl mt-2"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {card.options.map((option, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedMcqOption === idx;
                      const isOptionCorrect =
                        normalizeText(option) === normalizeText(card.back);

                      let buttonStyle =
                        'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]';
                      let badgeIcon = null;

                      if (selectedMcqOption !== null && selectedMcqOption !== undefined) {
                        if (isSelected) {
                          if (isOptionCorrect) {
                            buttonStyle =
                              'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold ring-2 ring-emerald-500/40';
                            badgeIcon = (
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                                ✓
                              </span>
                            );
                          } else {
                            buttonStyle =
                              'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold ring-2 ring-rose-500/40';
                            badgeIcon = (
                              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                                ✕
                              </span>
                            );
                          }
                        } else if (isOptionCorrect) {
                          buttonStyle =
                            'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium';
                          badgeIcon = (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                              Correct
                            </span>
                          );
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectMcq(idx)}
                          className={[
                            'w-full text-left px-4 py-3 sm:py-3.5 rounded-[var(--radius-md)] border text-[14px] sm:text-[15px]',
                            'transition-all duration-[var(--duration-fast)] flex items-center justify-between gap-3 cursor-pointer shadow-sm',
                            buttonStyle,
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-full bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[12px] font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {letter}
                            </span>
                            <span className="text-left break-words leading-relaxed flex-1 font-medium text-[14px] sm:text-[15px]">
                              {cleanOptionDisplay(option)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                            {badgeIcon}
                            <span className="text-[11px] opacity-40 font-mono hidden sm:inline">
                              [{idx + 1}]
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* MCQ Feedback / Flip Action */}
                <div
                  className="mt-3 flex flex-col items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {selectedMcqOption !== null && selectedMcqOption !== undefined ? (
                    <div className="flex flex-col items-center gap-2 animate-count-up">
                      {isMcqCorrect ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[13px] font-semibold">
                          ✓ Correct! Great recall.
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 text-[13px] font-semibold">
                          ✕ Incorrect — correct answer highlighted in green above.
                        </span>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={onFlip}
                        className="text-[13px] font-semibold"
                      >
                        Reveal Explanation & Rate →
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      Select an option above · Keyboard: A–D or 1–4
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 3. BASIC FLASHCARD (WITH ACTIVE-RECALL ANSWER BOX) */}
            {card.type === 'basic' && (
              <div className="w-full flex flex-col items-center">
                <div className="text-[19px] sm:text-[23px] font-semibold leading-relaxed text-[var(--color-text)] mb-3">
                  {isCode ? (
                    <div className="text-left rounded-xl overflow-hidden border border-[#333333] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] sm:text-[14px] p-4 my-2">
                      <pre className="whitespace-pre-wrap leading-relaxed">{cleanCodeText(card.front)}</pre>
                    </div>
                  ) : (
                    renderFormattedInlineText(card.front)
                  )}
                </div>

                {/* Active recall input box */}
                <div
                  className="w-full max-w-md mt-2 text-left"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-1 px-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Your Answer (Active Recall Test)
                    </label>
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      Optional · Type before flipping
                    </span>
                  </div>
                  <textarea
                    value={basicAnswer}
                    onChange={(e) => setBasicAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        onFlip();
                      }
                    }}
                    placeholder="Formulate and type your answer here to test your recall..."
                    rows={2}
                    className="w-full px-3.5 py-2 text-[14px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-text)] resize-none shadow-sm transition-all"
                  />
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      Press ⌘+Enter to reveal
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onFlip}
                      className="text-[12px] font-semibold py-1 px-3"
                    >
                      Reveal Answer →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Flip Link */}
          <div className="text-center pt-2">
            <span className="text-[13px] font-medium text-[var(--color-text)] hover:opacity-75 inline-flex items-center gap-1 transition-opacity">
              Reveal Answer & Rate
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>

        {/* ─── Back Side ──────────────────────────────────────────────────── */}
        <div className="card-flip-back h-full w-full p-5 sm:p-7 flex flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-md)] overflow-y-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Badge variant="accent" size="sm">
              Answer & Recall
            </Badge>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              Rate your recall below (1–4)
            </span>
          </div>

          {/* Back Body Content */}
          <div className="my-auto flex flex-col items-center justify-center text-center w-full max-w-xl mx-auto py-2">
            {/* 1. CLOZE BACK */}
            {card.type === 'cloze' && (
              <div className="w-full flex flex-col items-center">
                {isCode ? (
                  <div className="w-full text-left rounded-xl overflow-hidden border border-[#333333] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] sm:text-[14px] shadow-md my-2">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-[#252526] border-b border-[#333333] select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold tracking-wide">
                        Completed Solution
                      </span>
                      <span className="w-8" />
                    </div>
                    <pre className="p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {clozeData.parts.map((part, i) => {
                        if (part.isBlank) {
                          return (
                            <span
                              key={i}
                              className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 underline decoration-2 underline-offset-2"
                            >
                              {clozeData.expectedAnswer}
                            </span>
                          );
                        }
                        return <span key={i}>{part.text}</span>;
                      })}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 my-2">
                    <p className="text-[17px] sm:text-[19px] font-medium text-[var(--color-text-secondary)] leading-relaxed">
                      {clozeData.parts.map((part, i) => {
                        if (part.isBlank) {
                          return (
                            <span
                              key={i}
                              className="text-emerald-600 dark:text-emerald-400 font-bold underline underline-offset-4 decoration-2 px-1"
                            >
                              {clozeData.expectedAnswer}
                            </span>
                          );
                        }
                        return <span key={i}>{part.text}</span>;
                      })}
                    </p>
                    <span className="text-[22px] sm:text-[26px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {clozeData.expectedAnswer}
                    </span>
                  </div>
                )}

                {/* Cloze Typed Comparison */}
                {clozeInput.trim() && (
                  <div className="w-full max-w-md my-2 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-left grid grid-cols-2 gap-3 text-[13px]">
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                        Your Answer
                      </span>
                      <span
                        className={`font-semibold ${
                          checkAnswerMatch(clozeInput, clozeData.expectedAnswer)
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {clozeInput}{' '}
                        {checkAnswerMatch(clozeInput, clozeData.expectedAnswer) ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                        Expected Answer
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {clozeData.expectedAnswer}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. MCQ BACK */}
            {card.type === 'mcq' && card.options && (
              <div className="w-full max-w-2xl sm:max-w-3xl my-2 space-y-2.5 text-left">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Choices Breakdown
                </span>
                {card.options.map((option, idx) => {
                  const isCorrectOption =
                    normalizeText(option) === normalizeText(card.back);
                  const isStudentChoice = selectedMcqOption === idx;

                  let badge = null;
                  let rowStyle =
                    'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] opacity-70';

                  if (isCorrectOption) {
                    rowStyle =
                      'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold opacity-100 ring-1 ring-emerald-500/30';
                    badge = (
                      <span className="text-[11px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                        ✓ Correct Answer
                      </span>
                    );
                  } else if (isStudentChoice) {
                    rowStyle =
                      'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-semibold opacity-100 ring-1 ring-rose-500/30';
                    badge = (
                      <span className="text-[11px] font-semibold bg-rose-500 text-white px-2 py-0.5 rounded-full shrink-0">
                        ✕ Your Choice
                      </span>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border text-[14px] sm:text-[15px] flex items-center justify-between gap-3 ${rowStyle}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="font-mono font-bold text-[12px] mt-0.5 shrink-0">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="text-left break-words leading-relaxed flex-1">
                          {cleanOptionDisplay(option)}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {badge}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. BASIC BACK */}
            {card.type === 'basic' && (
              <div className="w-full flex flex-col items-center">
                {basicAnswer.trim() ? (
                  <div className="w-full max-w-lg my-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                        Your Typed Answer
                      </span>
                      <p className="text-[14px] text-[var(--color-text)] leading-relaxed break-words">
                        {basicAnswer}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)]">
                      <span className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider block mb-1">
                        Model Answer
                      </span>
                      <p className="text-[14px] font-semibold text-[var(--color-text)] leading-relaxed break-words">
                        {card.back}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[19px] sm:text-[23px] font-semibold text-[var(--color-text)] leading-relaxed mb-2">
                    {isCodeSnippet(card.back) ? (
                      <div className="text-left rounded-xl overflow-hidden border border-[#333333] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] sm:text-[14px] p-4 my-2">
                        <pre className="whitespace-pre-wrap leading-relaxed">{cleanCodeText(card.back)}</pre>
                      </div>
                    ) : (
                      renderFormattedInlineText(card.back)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Explanation Section */}
            {card.explanation && (
              <div className="mt-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] sm:text-[15px] leading-relaxed text-[var(--color-text-secondary)] text-left w-full max-w-lg shadow-sm">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)] text-[12px] uppercase tracking-wider mb-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-[var(--color-text)]"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Explanation
                </div>
                <div className="text-[var(--color-text)]">
                  {renderFormattedInlineText(card.explanation)}
                </div>
              </div>
            )}
          </div>

          <div className="h-2" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
