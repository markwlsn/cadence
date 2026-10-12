'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Card } from '@/types';
import type { ExplainResponse } from '@/app/api/review/explain/route';
import { Button, Badge } from '@/components/ui';
import { cleanOptionDisplay } from '@/lib/assessments';
import { createSSEParser, parseStreamingRationale } from '@/lib/ai/sse';

interface Props {
  card: Card;
  chosenAnswer?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AIRationaleModal({ card, chosenAnswer, isOpen, onClose }: Props) {
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsComplete(true);
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setStreamingText('');
      setLoading(false);
      setIsStreaming(false);
      setIsComplete(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setIsStreaming(false);
    setIsComplete(false);
    setStreamingText('');
    setData(null);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payload = {
      question: card.front,
      chosenAnswer: chosenAnswer || undefined,
      correctAnswer: card.back,
      explanation: card.explanation,
      cardType: card.type,
      options: card.options && card.options.length > 0 ? card.options : undefined,
    };

    async function fetchNonStreamingFallback() {
      try {
        const res = await fetch('/api/review/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to load rationale: ${res.statusText}`);
        }

        const json: ExplainResponse = await res.json();
        if (isMounted) {
          setData(json);
          setIsComplete(true);
        }
      } catch (err: unknown) {
        if (isMounted && !controller.signal.aborted) {
          setError('Unable to generate Socratic rationale. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsStreaming(false);
        }
      }
    }

    async function startStreaming() {
      let receivedFirstToken = false;
      const parser = createSSEParser();

      try {
        const res = await fetch('/api/review/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const events = parser.feed(chunk);

          for (const ev of events) {
            if (ev.type === 'delta') {
              if (!receivedFirstToken) {
                receivedFirstToken = true;
                if (isMounted) {
                  setLoading(false);
                  setIsStreaming(true);
                }
              }
              accumulatedText += ev.text;
              if (isMounted) {
                setStreamingText(accumulatedText);
              }
            } else if (ev.type === 'error') {
              throw new Error(ev.message);
            } else if (ev.type === 'done') {
              if (isMounted) {
                setIsStreaming(false);
                setIsComplete(true);
              }
            }
          }
        }

        if (isMounted) {
          setIsStreaming(false);
          setIsComplete(true);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        // Retry once with existing non-streaming call if failed before first token
        if (!receivedFirstToken) {
          console.warn('[AIRationaleModal] Streaming failed before first token, retrying non-streaming:', err);
          await fetchNonStreamingFallback();
        } else {
          if (isMounted) {
            setIsStreaming(false);
            setIsComplete(true);
          }
        }
      } finally {
        if (isMounted && receivedFirstToken) {
          setLoading(false);
          setIsStreaming(false);
        }
      }
    }

    startStreaming();

    return () => {
      isMounted = false;
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen, card, chosenAnswer]);

  if (!isOpen) return null;

  const parsedSections = streamingText ? parseStreamingRationale(streamingText) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Socratic Rationale Tutor"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl p-4 sm:p-7 space-y-5 text-[var(--color-text)] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Reader ARIA Live Status Announcement (Announces once on complete) */}
        <div role="status" aria-live="polite" className="sr-only">
          {isComplete ? 'Socratic rationale generation complete.' : ''}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Socratic Rationale Tutor
              </span>
              <Badge variant="accent" size="sm" className="font-semibold text-[10px]">
                {isStreaming
                  ? 'Streaming Rationale…'
                  : data?.source === 'ai' || streamingText
                  ? 'Claude / Gemini AI'
                  : 'Cognitive Heuristic'}
              </Badge>
            </div>
            <h3 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[var(--color-text)]">
              Conceptual Contrast Analysis
            </h3>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors text-[18px]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Loading State Before First Token */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Analyzing cognitive traps and causal mechanisms…
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[13px]">
            {error}
          </div>
        )}

        {/* Streaming Loaded Content */}
        {!loading && parsedSections && (
          <div className="space-y-4 text-[13.5px] leading-relaxed">
            {/* The Causal Mechanism (Why Correct) */}
            <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓</span> Why The Correct Answer Is Right
                </span>
                {isStreaming && !parsedSections.misconception && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 animate-pulse font-medium">
                    Typing…
                  </span>
                )}
              </div>
              <p className="text-[var(--color-text)] font-medium leading-relaxed">
                {parsedSections.correctPrinciple}
                {isStreaming && !parsedSections.misconception && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-500 animate-pulse" />
                )}
              </p>
            </div>

            {/* Cognitive Trap & Distractor Analysis */}
            {parsedSections.misconception && (
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {chosenAnswer ? '⚠️ The Cognitive Trap in Your Choice' : '⚠️ Common Distractor Pitfall'}
                  </span>
                  {isStreaming && !parsedSections.keyTakeaway && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 animate-pulse font-medium">
                      Typing…
                    </span>
                  )}
                </div>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  {parsedSections.misconception}
                  {isStreaming && !parsedSections.keyTakeaway && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-500 animate-pulse" />
                  )}
                </p>
              </div>
            )}

            {/* Key Active-Recall Takeaway */}
            {parsedSections.keyTakeaway && (
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-text)] text-[var(--color-bg)] space-y-1 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest opacity-80 block">
                    🧠 Anchor Takeaway for Active Recall
                  </span>
                  {isStreaming && (
                    <span className="text-[10px] opacity-75 animate-pulse font-medium">
                      Finalizing…
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[13px] italic">
                  &ldquo;{parsedSections.keyTakeaway}&rdquo;
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--color-bg)] animate-pulse" />
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Non-Streaming / Fallback Loaded Content */}
        {!loading && !streamingText && data && (
          <div className="space-y-4 text-[13.5px] leading-relaxed">
            {/* The Causal Mechanism (Why Correct) */}
            <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓</span> Why The Correct Answer Is Right
                </span>
              </div>
              <p className="text-[var(--color-text)] font-medium leading-relaxed">
                {data.correctPrinciple}
              </p>
            </div>

            {/* Why Other Options Are Wrong (Distractor Breakdown) */}
            {data.distractors && data.distractors.filter((d) => !d.isCorrect).length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                  ✗ Why Other Options Are Wrong (Distractor Analysis)
                </span>
                <div className="space-y-2">
                  {data.distractors
                    .filter((d) => !d.isCorrect)
                    .map((distractor, idx) => {
                      const isChosen =
                        chosenAnswer &&
                        distractor.option.trim().toLowerCase() === chosenAnswer.trim().toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-[var(--radius-md)] border space-y-1 transition-all ${
                            isChosen
                              ? 'bg-amber-500/10 border-amber-500/40 text-[var(--color-text)]'
                              : 'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-[13px] text-rose-500 shrink-0">
                                ✗
                              </span>
                              <span className="font-semibold text-[13px] text-[var(--color-text)] truncate">
                                {cleanOptionDisplay(distractor.option)}
                              </span>
                            </div>
                            {isChosen && (
                              <Badge variant="accent" size="sm" className="font-bold text-[10px] shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                ⚠️ Your Choice
                              </Badge>
                            )}
                          </div>
                          <p className="text-[12.5px] text-[var(--color-text-secondary)] leading-relaxed pl-4">
                            {distractor.explanation}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Fallback Single Trap Card when no multi-choice distractors */
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {chosenAnswer ? '⚠️ The Cognitive Trap in Your Choice' : '⚠️ Common Distractor Pitfall'}
                  </span>
                </div>
                <p className="text-[var(--color-text-secondary)]">
                  {data.misconception}
                </p>
              </div>
            )}

            {/* Key Active-Recall Takeaway */}
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-text)] text-[var(--color-bg)] space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-80 block">
                🧠 Anchor Takeaway for Active Recall
              </span>
              <p className="font-semibold text-[13px] italic">
                &ldquo;{data.keyTakeaway}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {isStreaming ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleStop}
              className="text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
            >
              ⏹ Stop
            </Button>
          ) : (
            <div />
          )}
          <Button variant="primary" size="md" onClick={handleClose} className="w-full sm:w-auto">
            Understood · Continue Review
          </Button>
        </div>
      </div>
    </div>
  );
}
