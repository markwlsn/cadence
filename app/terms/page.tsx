import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-[var(--color-text-subtle)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <header className="border-b border-[var(--color-border)] pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Academic Terms of Service & Honor Code</h1>
            <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
              Last updated: October 5, 2026 · Cadence Study Platform
            </p>
          </header>

          <section className="space-y-4 text-base leading-relaxed text-[var(--color-text-muted)]">
            <h2 className="text-xl font-bold text-[var(--color-text)]">1. Purpose and Educational Mission</h2>
            <p>
              Cadence is designed to foster cognitive mastery through evidence-based cognitive science: spaced repetition
              (FSRS), active recall, and deliberate practice. By utilizing Cadence, you agree to abide by these Terms and
              your institution&apos;s academic honor code.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">2. Academic Integrity & Fair Use</h2>
            <p>
              Students and educators must respect intellectual property rights. You agree not to upload:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Confidential, proctored examinations or secure answer keys prohibited by your university.</li>
              <li>Proprietary textbooks or third-party commercial content in violation of fair-use guidelines.</li>
              <li>Any materials that compromise institutional academic integrity standards.</li>
            </ul>

            <h2 className="text-xl font-bold text-[var(--color-text)]">3. AI-Assisted Study Tools</h2>
            <p>
              Cadence uses AI to summarize syllabus materials, generate active-recall flashcards, and explain multiple-choice
              distractors. While our algorithms aim for high factual accuracy, students are encouraged to review cards against
              primary course textbooks. Cadence does not substitute for original student scholarship or classroom instruction.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">4. Account Responsibility & Security</h2>
            <p>
              You are responsible for safeguarding your login credentials. Automated bulk scraping, denial-of-service
              probes, or reverse engineering of the platform is strictly prohibited.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">5. Service Availability</h2>
            <p>
              While we strive for 99.9% uptime during midterm and final exam seasons, Cadence is provided on an &quot;as-is&quot;
              basis. We recommend exporting important study decks periodically to maintain local offline archives.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
