'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Deck, DeckStats, Card } from '@/types';
import { Button, Badge, ProgressRing } from '@/components/ui';
import { getDeckAssessmentProgress } from '@/lib/assessments';
import { generateDiagnosticReport, type AcademicDiagnosticReport } from '@/lib/diagnostic';
import { getCurrentUser } from '@/lib/auth';

interface Props {
  deck: Deck;
  stats: DeckStats;
  cards: Card[];
}

export default function DiagnosticReportClient({ deck, stats, cards }: Props) {
  const [report, setReport] = useState<AcademicDiagnosticReport | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const progressMap = getDeckAssessmentProgress(deck.id);
    const user = getCurrentUser();
    const studentName = user && !user.isGuest ? user.name : 'Candidate Scholar';
    const rep = generateDiagnosticReport(deck, stats, cards, progressMap, studentName);
    setReport(rep);
  }, [deck, stats, cards]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!mounted || !report) {
    return (
      <div className="py-24 text-center">
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Synthesizing Academic Diagnostic Report…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Top Navigation & Action Controls (Hidden on Print) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/decks/${deck.id}`}
            className="text-[13px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Deck
          </Link>
          <span className="text-[var(--color-border)]">•</span>
          <span className="text-[13px] text-[var(--color-text-tertiary)] truncate max-w-[200px] sm:max-w-xs">
            {deck.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 !bg-[var(--color-text)] !text-[var(--color-bg)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* ── Official Printable Diagnostic Document ── */}
      <div className="p-4 sm:p-8 md:p-12 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] print:p-0 print:border-none print:shadow-none print:bg-white text-[var(--color-text)] space-y-8 overflow-hidden">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--color-text)] text-[var(--color-bg)] font-black text-[11px]">
                C
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Cadence Academic Evaluation Engine
              </span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[var(--color-text)]">
              Diagnostic Readiness Report
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-medium">
              Curriculum Unit: <span className="text-[var(--color-text)] font-semibold">{report.deckTitle}</span>
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1 text-[12px] text-[var(--color-text-secondary)]">
            <div>
              <span className="font-semibold text-[var(--color-text)]">Candidate:</span> {report.studentName}
            </div>
            <div>
              <span className="font-semibold text-[var(--color-text)]">Evaluated:</span> {report.generatedDate}
            </div>
            <div className="font-mono text-[11px] text-[var(--color-text-tertiary)]">
              Ref: {report.verificationCode}
            </div>
          </div>
        </div>

        {/* Executive Forecast Card */}
        <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing
                percent={report.overallReadiness}
                size={88}
                strokeWidth={8}
                color="var(--color-text)"
              />
              <span className="absolute text-[20px] font-bold text-[var(--color-text)]">
                {report.overallReadiness}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)]">
                Overall Projected Readiness
              </div>
              <div className="text-[20px] font-bold text-[var(--color-text)]">
                {report.readinessLabel}
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)] font-medium">
                {report.passLikelihood}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:border-l sm:border-[var(--color-border)] sm:pl-6 shrink-0 text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Curriculum</div>
              <div className="text-[16px] font-bold text-[var(--color-text)]">{report.curriculumCompletionPercent}%</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">40% weight</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Test Avg.</div>
              <div className="text-[16px] font-bold text-[var(--color-text)]">
                {report.averageAssessmentScore > 0 ? `${report.averageAssessmentScore}%` : '—'}
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">35% weight</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Retention</div>
              <div className="text-[16px] font-bold text-[var(--color-text)]">{report.retentionStabilityPercent}%</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">25% weight</div>
            </div>
          </div>
        </div>

        {/* Section 1: Linear Milestone Progression Audit */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text)] flex items-center justify-between">
            <span>1. Curriculum Assessment Milestone Audit</span>
            <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
              {report.assessmentsAudit.filter((a) => a.completed).length} of {report.assessmentsAudit.length} Completed
            </span>
          </h2>

          <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-x-auto w-full max-w-full">
            <table className="w-full text-left text-[13px] min-w-[500px]">
              <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Assessment</th>
                  <th className="py-2.5 px-4 font-semibold">Scope & Tier</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Items</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.assessmentsAudit.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-surface-raised)]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[var(--color-text)]">
                      {item.title}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {item.subtitle}
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                      {item.targetCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.completed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--color-text)]">
                      {item.score !== null ? `${item.score}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Cognitive Domain Analysis */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text)]">
            2. Cognitive Domain & Question Format Breakdown
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.domains.map((dom, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-bold text-[var(--color-text)]">{dom.name}</div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      dom.status === 'proficient'
                        ? 'border-[var(--color-border)] bg-[var(--color-text)] text-[var(--color-bg)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {dom.status === 'proficient'
                      ? 'Proficient'
                      : dom.status === 'satisfactory'
                      ? 'Satisfactory'
                      : 'Needs Focus'}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)]">
                  Format: {dom.cardType}
                </div>
                <div className="pt-2 flex items-center justify-between text-[12px]">
                  <span className="text-[var(--color-text-secondary)]">
                    {dom.masteredCount} of {dom.totalItems} mastered
                  </span>
                  <span className="font-bold text-[var(--color-text)]">{dom.masteryPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-text)] transition-all duration-300"
                    style={{ width: `${dom.masteryPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Diagnostic Findings (Strengths & Gaps) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
              <span>✓ Verified Strengths</span>
            </h3>
            <ul className="space-y-1.5">
              {report.strengths.map((str, i) => (
                <li
                  key={i}
                  className="text-[13px] text-[var(--color-text-secondary)] flex items-start gap-2 bg-[var(--color-surface-raised)]/40 p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)]"
                >
                  <span className="text-[var(--color-text)] font-bold">✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
              <span>⚠ Identified Knowledge Gaps</span>
            </h3>
            <ul className="space-y-1.5">
              {report.weakSpots.map((gap, i) => (
                <li
                  key={i}
                  className="text-[13px] text-[var(--color-text-secondary)] flex items-start gap-2 bg-[var(--color-surface-raised)]/40 p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)]"
                >
                  <span className="text-[var(--color-text-tertiary)] font-bold">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 4: Prescribed Academic Action Plan */}
        <div className="space-y-3 pt-2">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text)]">
            3. Prescribed Exam Preparation Action Plan
          </h2>
          <div className="space-y-2">
            {report.prescription.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3.5 p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]/20"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[var(--color-text)]">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                    {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Footer */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[var(--color-text-tertiary)]">
          <div>
            Cadence Learning System · Validated against FSRS v4.5 spaced-repetition retention model.
          </div>
          <div className="font-mono">
            {report.verificationCode} · Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
}
