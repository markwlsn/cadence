'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, SegmentedControl, Navbar, BackButton } from '@/components/ui';
import { createDeck } from '@/lib/data';

type SourceType = 'pdf' | 'text' | 'image';

export default function NewDeckPage() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>('pdf');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              <label className="block text-[13px] font-semibold text-[var(--color-text)] mb-2 uppercase tracking-wide">
                Input Method
              </label>
              <SegmentedControl<SourceType>
                name="source-type"
                value={sourceType}
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
              <div>
                <label
                  htmlFor="pasted-text"
                  className="block text-[13px] font-semibold text-[var(--color-text)] mb-2 uppercase tracking-wide"
                >
                  Raw Notes or Lecture Summary
                </label>
                <textarea
                  id="pasted-text"
                  rows={7}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture notes, textbook summaries, definitions, or bullet points here..."
                  className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[15px] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-text)] focus:bg-[var(--color-surface-raised)] transition-colors resize-y leading-relaxed font-sans"
                />
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

            {/* Submit Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
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
