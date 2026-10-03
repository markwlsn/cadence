import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/ui';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Student Privacy Policy</h1>
            <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
              Last updated: October 5, 2026 · Compliant with FERPA & GDPR (Article 15–20)
            </p>
          </header>

          <section className="space-y-4 text-base leading-relaxed text-[var(--color-text-muted)]">
            <h2 className="text-xl font-bold text-[var(--color-text)]">1. Commitment to Academic Data Privacy</h2>
            <p>
              Cadence is built exclusively for students, educators, and scholars. We treat student study materials,
              lecture slides, test performance, and spaced-repetition schedules with the highest standards of confidentiality.
              We do not sell, broker, or monetize your educational data under any circumstances.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">2. FERPA & GDPR Compliance</h2>
            <p>
              In compliance with the Family Educational Rights and Privacy Act (FERPA) and the General Data Protection
              Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Zero Third-Party Advertising:</strong> No behavioral trackers, third-party analytics pixels, or
                ad networks are integrated into Cadence.
              </li>
              <li>
                <strong>Academic Work Product Ownership:</strong> All flashcards, notes, and uploaded syllabi remain the
                exclusive intellectual property of the student or respective institution.
              </li>
              <li>
                <strong>Right to Access & Portability:</strong> Students can export their complete study history and card
                decks at any time in structured JSON format via our export endpoint.
              </li>
              <li>
                <strong>Right to Erasure (Forget Me):</strong> Initiating account deletion permanently purges all user
                records, decks, cards, and review intervals from our databases.
              </li>
            </ul>

            <h2 className="text-xl font-bold text-[var(--color-text)]">3. AI Processing & Model Isolation</h2>
            <p>
              Uploaded study documents processed through our AI generation pipeline (powered by Google Gemini) are
              transmitted securely via TLS 1.3. Inputs are processed strictly on-demand for card synthesis and distractor
              explanation and are not retained to train public foundation models.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">4. Security & Cryptographic Controls</h2>
            <p>
              User authentication credentials are encrypted using scrypt hashing with per-user cryptographically random
              salts. API endpoints enforce strict server-side authorization boundaries to prevent unauthorized data access.
            </p>

            <h2 className="text-xl font-bold text-[var(--color-text)]">5. Contact & Privacy Office</h2>
            <p>
              If you have any questions regarding data rights, compliance audits, or account deletion, contact our
              academic privacy team at <code className="text-sm bg-[var(--color-surface)] px-1 py-0.5 rounded">privacy@cadence.app</code>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
