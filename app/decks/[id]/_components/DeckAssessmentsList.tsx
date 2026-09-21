'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getDeckAssessments,
  getDeckAssessmentProgress,
  type DeckAssessment,
  type AssessmentProgress,
} from '@/lib/assessments';
import { Button } from '@/components/ui';

interface Props {
  deckId: string;
  totalCards: number;
}

export default function DeckAssessmentsList({ deckId, totalCards }: Props) {
  const [progressMap, setProgressMap] = useState<Record<string, AssessmentProgress>>({});
  const [mounted, setMounted] = useState(false);

  const assessments = getDeckAssessments(totalCards);

  useEffect(() => {
    setMounted(true);
    setProgressMap(getDeckAssessmentProgress(deckId));

    const handleUpdate = () => {
      setProgressMap(getDeckAssessmentProgress(deckId));
    };

    window.addEventListener('cadence_assessment_updated', handleUpdate);
    return () => {
      window.removeEventListener('cadence_assessment_updated', handleUpdate);
    };
  }, [deckId]);

  const completedCount = assessments.filter(
    (a) => progressMap[a.id]?.completed
  ).length;
  const progressPercent = Math.round((completedCount / assessments.length) * 100);

  // Group assessments by tier
  const foundational = assessments.filter((a) => a.tier === 'quiz');
  const midReview = assessments.filter((a) => a.tier === 'long-quiz');
  const comprehensive = assessments.filter((a) => a.tier === 'exam');

  const renderAssessmentCard = (item: DeckAssessment, index: number) => {
    const progress = progressMap[item.id];
    const isCompleted = progress?.completed;

    return (
      <div
        key={item.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all gap-4"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[var(--color-surface-overlay)] text-[var(--color-text)] border border-[var(--color-border)]">
              {item.tier === 'quiz' ? 'Short Quiz' : item.tier === 'long-quiz' ? 'Long Quiz' : 'Comprehensive'}
            </span>
            <h4 className="text-[16px] font-bold text-[var(--color-text)]">
              {item.title}
            </h4>
            {mounted && isCompleted && (
              <span className="text-[12px] font-semibold text-[var(--color-success)] px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                Score: {progress.score}% · {progress.score >= 70 ? 'Passed' : 'Reviewed'}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {item.subtitle} — {item.description}
          </p>
          <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-tertiary)] pt-0.5">
            <span>📝 {item.targetCount} questions</span>
            <span>·</span>
            <span>⏱️ ~{item.estimatedMinutes} mins</span>
            {mounted && progress?.lastAttemptDate && (
              <>
                <span>·</span>
                <span>Last taken: {new Date(progress.lastAttemptDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
          <Link href={`/decks/${deckId}/review?assessment=${item.id}`} className="w-full sm:w-auto">
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              className="text-[13px] whitespace-nowrap w-full sm:w-auto min-w-[110px]"
            >
              {isCompleted ? 'Retake Quiz' : 'Start Quiz →'}
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Curriculum Header & Linear Progress */}
      <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-[17px] font-bold text-[var(--color-text)] tracking-tight">
              Linear Study Curriculum
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Progress through foundational quizzes to build concept mastery before the 35-item comprehensive exam.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[13px] font-semibold text-[var(--color-text)]">
              {completedCount} of {assessments.length} Completed
            </span>
            <span className="block text-[11px] text-[var(--color-text-secondary)]">
              {progressPercent}% curriculum mastery
            </span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-text)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tier 1: Foundational Quizzes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider">
            1. Foundational Quizzes
          </span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            (Concepts & Mechanisms)
          </span>
        </div>
        <div className="space-y-2">
          {foundational.map((item, idx) => renderAssessmentCard(item, idx))}
        </div>
      </section>

      {/* Tier 2: Synthesis Long Quizzes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider">
            2. Comprehensive Long Quizzes
          </span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            (Multi-Concept Synthesis)
          </span>
        </div>
        <div className="space-y-2">
          {midReview.map((item, idx) => renderAssessmentCard(item, idx))}
        </div>
      </section>

      {/* Tier 3: Final Comprehensive Exam */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wider">
            3. Comprehensive Exam
          </span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            (Full Syllabus Simulation)
          </span>
        </div>
        <div className="space-y-2">
          {comprehensive.map((item, idx) => renderAssessmentCard(item, idx))}
        </div>
      </section>
    </div>
  );
}
