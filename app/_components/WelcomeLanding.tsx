'use client';

import React from 'react';
import Link from 'next/link';
import { Button, CadenceLogo } from '@/components/ui';

export default function WelcomeLanding() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg)]">
      {/* ── 1. Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          {/* Subtle Tag Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] animate-count-up">
            <CadenceLogo size={16} />
            <span className="text-[12px] font-semibold text-[var(--color-text)] tracking-wide uppercase">
              Academic Review &amp; Active Recall
            </span>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-[36px] sm:text-[56px] lg:text-[64px] font-bold tracking-tight text-[var(--color-text)] leading-[1.1] max-w-3xl mx-auto">
              Master any curriculum with structured AI review.
            </h1>
            <p className="text-[17px] sm:text-[20px] text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed font-normal">
              Transform lecture notes, textbook PDFs, and study materials into linear assessment sequences and long-term memory.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold shadow-md"
              >
                Get Started Free →
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* ── Visual Preview Card ───────────────────────────────────── */}
          <div className="pt-8 max-w-2xl mx-auto">
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 sm:p-8 shadow-[var(--shadow-lg)] text-left space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[20px]">
                    🔬
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-[var(--color-text)] leading-snug">
                      Molecular Genetics &amp; Inheritance
                    </h2>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      Linear Curriculum · 6 Structured Assessments · 35 Total Questions
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]">
                  92% Retained
                </span>
              </div>

              {/* Curriculum Progression Snapshot */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-[12px] font-bold flex items-center justify-center">
                      ✓
                    </span>
                    <div>
                      <span className="text-[13px] font-bold text-[var(--color-text)] block">
                        Quiz 1: Nucleic Acids &amp; Transcription
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        5 questions · Score: 100% · Completed
                      </span>
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                    Passed
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border-2 border-[var(--color-text)] text-[var(--color-text)] text-[12px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <span className="text-[13px] font-bold text-[var(--color-text)] block">
                        Quiz 2: Translation &amp; Codon Logic
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        5 questions · Ready for testing
                      </span>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--color-text)] underline">
                    Next Up →
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]/60 border border-[var(--color-border)] opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-[var(--color-border)] text-[var(--color-text-tertiary)] text-[12px] font-medium flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <span className="text-[13px] font-medium text-[var(--color-text-secondary)] block">
                        Comprehensive Exam: Full Simulation
                      </span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">
                        35 questions · Final cumulative evaluation
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                    Locked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Linear Curriculum Architecture ───────────────────────────── */}
      <section id="curriculum" className="py-20 sm:py-28 border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Curriculum Design
            </span>
            <h2 className="text-[28px] sm:text-[38px] font-bold text-[var(--color-text)] tracking-tight">
              A Structured Pathway. Not Random Memorization.
            </h2>
            <p className="text-[15px] sm:text-[17px] text-[var(--color-text-secondary)] leading-relaxed">
              Standard flashcard tools present random questions without context. Cadence organizes your study materials into an intentional 3-tier sequence modeled after real university coursework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[18px] font-bold text-[var(--color-text)]">
                  1
                </div>
                <h3 className="text-[18px] font-bold text-[var(--color-text)]">
                  Short Quizzes (1, 2, 3)
                </h3>
                <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                  ~5 items each. Rapid-fire assessments focusing on core definitions, formula relationships, and essential terminology to build confidence.
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)] block">
                Target: 100% Foundational Mastery
              </span>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[18px] font-bold text-[var(--color-text)]">
                  2
                </div>
                <h3 className="text-[18px] font-bold text-[var(--color-text)]">
                  Long Quizzes (1, 2)
                </h3>
                <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                  ~12–15 items each. Multi-concept synthesis testing your ability to differentiate contrasting principles and apply rules to new scenarios.
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)] block">
                Target: Conceptual Synthesis
              </span>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[18px] font-bold text-[var(--color-text)]">
                  3
                </div>
                <h3 className="text-[18px] font-bold text-[var(--color-text)]">
                  Comprehensive Exam
                </h3>
                <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                  35 items. Full mock test under actual exam conditions. Comprehensive coverage across all lecture chunks to ensure exam readiness.
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)] block">
                Target: Final Exam Simulation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Methodology & AI Synthesis ───────────────────────────────── */}
      <section id="methodology" className="py-20 sm:py-28 border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Automated Synthesis
            </span>
            <h2 className="text-[28px] sm:text-[38px] font-bold text-[var(--color-text)] tracking-tight">
              From Lecture Notes to Assessments in Seconds
            </h2>
            <p className="text-[15px] sm:text-[17px] text-[var(--color-text-secondary)] leading-relaxed">
              Stop wasting hours manually formatting question cards. Cadence synthesizes clean, accurate study modules from your materials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <span className="text-[28px]">📄</span>
              <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                1. Upload Study Materials
              </h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                Drop lecture PDFs, photos of whiteboard diagrams, or paste chapter notes.
              </p>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <span className="text-[28px]">🧠</span>
              <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                2. AI Knowledge Extraction
              </h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                Extracts key definitions, mechanisms, and active recall questions without hallucination.
              </p>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <span className="text-[28px]">🎯</span>
              <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                3. Linear Review &amp; Retention
              </h3>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                Step through quizzes with instant feedback, clear rationales, and spaced intervals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Spaced Repetition Science ─────────────────────────────────── */}
      <section id="science" className="py-20 sm:py-28 border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Cognitive Science
            </span>
            <h2 className="text-[28px] sm:text-[38px] font-bold text-[var(--color-text)] tracking-tight">
              FSRS Spaced Repetition Algorithm
            </h2>
            <p className="text-[15px] sm:text-[17px] text-[var(--color-text-secondary)] leading-relaxed">
              Memory fades predictably over time. Cadence utilizes the Free Spaced Repetition Scheduler (FSRS) to calculate the precise moment memory decay begins, prompting review right when it reinforces recall most effectively.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[20px] font-bold text-[var(--color-text)] block">Again</span>
              <span className="text-[12px] text-[var(--color-text-secondary)]">Lapse: Re-queues immediately</span>
            </div>
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[20px] font-bold text-[var(--color-text)] block">Hard</span>
              <span className="text-[12px] text-[var(--color-text-secondary)]">Short interval reinforcement</span>
            </div>
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[20px] font-bold text-[var(--color-text)] block">Good</span>
              <span className="text-[12px] text-[var(--color-text-secondary)]">Optimal retention spacing</span>
            </div>
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-[20px] font-bold text-[var(--color-text)] block">Easy</span>
              <span className="text-[12px] text-[var(--color-text-secondary)]">Extended stability interval</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Conversion CTA ────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-[32px] sm:text-[44px] font-bold text-[var(--color-text)] tracking-tight">
            Ready to elevate your study habits?
          </h2>
          <p className="text-[16px] text-[var(--color-text-secondary)] max-w-lg mx-auto">
            Create your account to start generating linear study decks from your notes. Free forever for students.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 font-semibold shadow-md">
                Create Free Account →
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-8 bg-[var(--color-bg)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2">
            <CadenceLogo size={20} />
            <span className="font-semibold text-[var(--color-text)]">Cadence</span>
            <span>· Academic AI Reviewer</span>
          </div>
          <p>© {new Date().getFullYear()} Cadence. Apple-grade simplicity for serious scholars.</p>
        </div>
      </footer>
    </div>
  );
}
