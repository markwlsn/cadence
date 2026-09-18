'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, SegmentedControl, Navbar, BackButton } from '@/components/ui';
import { createDeck } from '@/lib/data';
import { getCurrentUser, type User } from '@/lib/auth';

type SourceType = 'pdf' | 'text' | 'image';

export default function NewDeckPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('pdf');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser.isGuest) {
      router.replace('/login?redirect=/decks/new');
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      if (!title) {
        setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await createDeck({
        title: title.trim(),
        sourceType,
        rawContent: pastedText,
        file: file || undefined,
      });
      // Redirect to the newly created deck's dashboard
      router.push(`/decks/${result.deck.id}`);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create deck or generate flashcards.');
    }
  };

  if (!mounted || !user || user.isGuest) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
            <p className="text-[15px] text-[var(--color-text-secondary)]">
              Sign in required to create study decks…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />

      {/* Main Form Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 sm:p-10 flex flex-col justify-center">
        {isProcessing ? (
          /* Processing State */
          <div className="flex flex-col items-center justify-center py-16 text-center animate-count-up">
            <div className="w-16 h-16 rounded-full border-4 border-[var(--color-text)] border-t-transparent animate-spin mb-6" />
            <h2 className="text-[22px] font-semibold text-[var(--color-text)] mb-2">
              Analyzing your notes…
            </h2>
            <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm">
              Extracting key concepts, writing explanations, and formatting recall cards with FSRS parameters.
            </p>
            <p className="text-[13px] text-[var(--color-text-secondary)]/70 mt-3">
              Synthesizing active-recall flashcards (~15–20 seconds)…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="mb-4">
                <BackButton href="/" label="Dashboard" />
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--color-text)] mb-2">
                New Study Deck
              </h1>
              <p className="text-[15px] text-[var(--color-text-secondary)]">
                Provide notes in any format. Cadence synthesizes an active recall queue automatically.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[14px] flex items-start gap-3 animate-fade-in"
              >
                <span className="font-bold">Error:</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Deck Title */}
            <div>
              <label
                htmlFor="deck-title"
                className="block text-[13px] font-semibold text-[var(--color-text)] mb-2 uppercase tracking-wide"
              >
                Deck Title
              </label>
              <input
                id="deck-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cognitive Psychology, Organic Chemistry..."
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[16px] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-text)] focus:bg-[var(--color-surface-raised)] transition-colors"
              />
            </div>

            {/* Source Type Selector */}
            <div>
              <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">
                Input Method
              </label>
              <SegmentedControl<SourceType>
                name="source-type"
                value={sourceType}
                fullWidth
                size="md"
                onChange={(val) => {
                  setSourceType(val);
                  setFile(null);
                }}
                options={[
                  { value: 'pdf', label: 'PDF Document' },
                  { value: 'text', label: 'Paste Text' },
                  { value: 'image', label: 'Photo of Notes' },
                ]}
              />
            </div>

            {/* Input Method Content */}
            {sourceType === 'text' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="pasted-text"
                    className="block text-[13px] font-semibold text-[var(--color-text)] uppercase tracking-wide"
                  >
                    Raw Notes or Lecture Summary
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      Templates:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPastedText(
                          `Topic 1: Core Definitions & Foundations\n- Key Term 1: Definition and primary mechanism\n- Key Term 2: Core distinction from related processes\n\nTopic 2: Step-by-Step Mechanisms\n- Stage 1: Activation and rate-limiting factors\n- Stage 2: Synthesis and enzymatic regulation\n\nTopic 3: Applied Concepts & Clinical/Scenario Cases\n- Differential distinction between Condition A and Condition B\n- Common diagnostic pitfalls and distractor traps`
                        )
                      }
                      className="text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] underline"
                    >
                      Lecture Outline
                    </button>
                    <span className="text-[var(--color-border)]">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPastedText(
                          `Unit 1: Foundational Principles\n- Principle 1: Essential governing laws and terminology\n- Principle 2: Fundamental relationships and causes\n\nUnit 2: Advanced System Architecture\n- Core operational dynamics and cross-unit interactions\n- Problem cases, exceptions, and typical examination edge cases`
                        )
                      }
                      className="text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] underline"
                    >
                      Syllabus Unit
                    </button>
                  </div>
                </div>

                <textarea
                  id="pasted-text"
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture notes, textbook summaries, definitions, or slide bullet points here..."
                  className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[15px] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-text)] focus:bg-[var(--color-surface-raised)] transition-colors resize-y leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between text-[12px] text-[var(--color-text-secondary)] px-1">
                  <span>
                    {pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0} words
                  </span>
                  <span>
                    Aim for ≥ 200 words for balanced card variety across quizzes and mock exam
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[13px] font-semibold text-[var(--color-text)] mb-2 uppercase tracking-wide">
                  {sourceType === 'pdf' ? 'Upload PDF' : 'Upload Image'}
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-[var(--radius-lg)] p-8 sm:p-12 text-center cursor-pointer transition-all',
                    isDragging
                      ? 'border-[var(--color-text)] bg-[var(--color-surface-overlay)]'
                      : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]',
                  ].join(' ')}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={sourceType === 'pdf' ? '.pdf,application/pdf' : 'image/*'}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[var(--color-text)] shadow-sm">
                      {sourceType === 'pdf' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <path d="M14 2v6h6"/>
                          <path d="M16 13H8"/>
                          <path d="M16 17H8"/>
                          <path d="M10 9H8"/>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                          <circle cx="9" cy="9" r="2"/>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      {file ? (
                        <p className="font-semibold text-[15px] text-[var(--color-text)]">
                          {file.name}
                        </p>
                      ) : (
                        <>
                          <p className="font-semibold text-[15px] text-[var(--color-text)]">
                            Drop your {sourceType === 'pdf' ? 'PDF' : 'photo'} here, or click to browse
                          </p>
                          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                            {sourceType === 'pdf' ? 'Supports PDFs up to 50MB' : 'Supports JPG, PNG, WEBP'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Curriculum Roadmap Architecture Preview */}
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Automatic Curriculum Synthesis
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
                  Linear Roadmap
                </span>
              </div>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                Cadence will automatically partition your generated cards into 3 Foundational Quizzes, 2 Section Synthesis Long Quizzes, and a 35-item Comprehensive Mock Exam.
              </p>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  fullWidth
                >
                  Cancel
                </Button>
              </Link>
              <div className="flex-1 w-full">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!title.trim() || (sourceType === 'text' ? !pastedText.trim() : !file)}
                >
                  Generate Flashcards
                </Button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
