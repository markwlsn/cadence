import type { Deck, DeckStats, Card } from '@/types';
import { getDeckAssessments, type AssessmentProgress } from './assessments';
import { calculateExamReadiness } from './readiness';

export interface DiagnosticDomainAnalysis {
  name: string;
  cardType: string;
  totalItems: number;
  masteredCount: number;
  masteryPercent: number;
  status: 'proficient' | 'satisfactory' | 'needs-review';
}

export interface DiagnosticAssessmentAudit {
  id: string;
  title: string;
  subtitle: string;
  tier: string;
  targetCount: number;
  completed: boolean;
  score: number | null;
  lastAttemptDate?: string;
}

export interface StudyPrescription {
  step: number;
  title: string;
  action: string;
  priority: 'Immediate' | 'Recommended' | 'Prior to Exam';
}

export interface AcademicDiagnosticReport {
  deckId: string;
  deckTitle: string;
  studentName: string;
  generatedDate: string;
  verificationCode: string;
  overallReadiness: number;
  readinessLabel: string;
  passLikelihood: string;
  curriculumCompletionPercent: number;
  averageAssessmentScore: number;
  retentionStabilityPercent: number;
  assessmentsAudit: DiagnosticAssessmentAudit[];
  domains: DiagnosticDomainAnalysis[];
  strengths: string[];
  weakSpots: string[];
  prescription: StudyPrescription[];
  totalCards: number;
  masteredCards: number;
  dueCards: number;
}

/**
 * Synthesizes a diagnostic evaluation from curriculum progress, card types,
 * test scores, and FSRS retention stability.
 */
export function generateDiagnosticReport(
  deck: Deck,
  stats: DeckStats,
  cards: Card[],
  progressMap: Record<string, AssessmentProgress>,
  studentName = 'Candidate'
): AcademicDiagnosticReport {
  const readiness = calculateExamReadiness(progressMap, stats.totalCards, stats.masteredCount);
  const assessments = getDeckAssessments(stats.totalCards);

  // 1. Curriculum Audit
  const assessmentsAudit: DiagnosticAssessmentAudit[] = assessments.map((assessment) => {
    const progress = progressMap[assessment.id];
    return {
      id: assessment.id,
      title: assessment.title,
      subtitle: assessment.subtitle,
      tier: assessment.tier,
      targetCount: assessment.targetCount,
      completed: Boolean(progress?.completed),
      score: progress?.completed ? progress.score : null,
      lastAttemptDate: progress?.lastAttemptDate,
    };
  });

  // 2. Cognitive Domain Analysis (Basic/Cloze terminology vs MCQ analytical distinctions)
  const basicClozeCards = cards.filter((c) => c.type === 'basic' || c.type === 'cloze');
  const mcqCards = cards.filter((c) => c.type === 'mcq');

  const basicClozeMastered = basicClozeCards.filter((c) => (c.stability ?? 0) >= 3).length;
  const mcqMastered = mcqCards.filter((c) => (c.stability ?? 0) >= 3).length;

  const basicClozePercent =
    basicClozeCards.length > 0
      ? Math.round((basicClozeMastered / basicClozeCards.length) * 100)
      : 0;

  const mcqPercent =
    mcqCards.length > 0 ? Math.round((mcqMastered / mcqCards.length) * 100) : 0;

  const domains: DiagnosticDomainAnalysis[] = [
    {
      name: 'Core Terminology & Key Definitions',
      cardType: 'Basic & Cloze Recall',
      totalItems: basicClozeCards.length,
      masteredCount: basicClozeMastered,
      masteryPercent: basicClozePercent,
      status:
        basicClozePercent >= 80
          ? 'proficient'
          : basicClozePercent >= 50
          ? 'satisfactory'
          : 'needs-review',
    },
    {
      name: 'Conceptual Distinctions & Applications',
      cardType: 'Multiple Choice Rationales',
      totalItems: mcqCards.length,
      masteredCount: mcqMastered,
      masteryPercent: mcqPercent,
      status:
        mcqPercent >= 80
          ? 'proficient'
          : mcqPercent >= 50
          ? 'satisfactory'
          : 'needs-review',
    },
  ];

  // 3. Automated Strengths Identification
  const strengths: string[] = [];
  if (readiness.breakdown.curriculumProgress >= 80) {
    strengths.push('Complete adherence to the structured assessment roadmap.');
  }
  if (readiness.breakdown.averageScore >= 85) {
    strengths.push(`High testing accuracy across completed quizzes (${readiness.breakdown.averageScore}% avg).`);
  }
  if (basicClozePercent >= 75) {
    strengths.push('Strong foundational grasp of core terminology and keywords.');
  }
  if (mcqPercent >= 75) {
    strengths.push('High proficiency distinguishing distractors in scenario-based questions.');
  }
  if (strengths.length === 0) {
    strengths.push('Active study cycle established with baseline diagnostics recorded.');
  }

  // 4. Weak Spots / Gaps Identification
  const weakSpots: string[] = [];
  const incompleteQuizzes = assessmentsAudit.filter((a) => !a.completed);
  if (incompleteQuizzes.length > 0) {
    weakSpots.push(
      `${incompleteQuizzes.length} milestone assessment${
        incompleteQuizzes.length > 1 ? 's' : ''
      } remain unattempted (${incompleteQuizzes.map((q) => q.title.split(' ')[0]).join(', ')}).`
    );
  }

  const lowScoreQuizzes = assessmentsAudit.filter(
    (a) => a.completed && a.score !== null && a.score < 75
  );
  if (lowScoreQuizzes.length > 0) {
    weakSpots.push(
      `Sub-optimal score recorded on ${lowScoreQuizzes.map((q) => q.title).join(', ')} (< 75%).`
    );
  }

  if (mcqCards.length > 0 && mcqPercent < 60) {
    weakSpots.push('Distractor discrimination in MCQ items requires targeted conceptual review.');
  }
  if (stats.dueNow > 5) {
    weakSpots.push(`${stats.dueNow} items have decayed in memory and are due for retrieval review.`);
  }

  // 5. Prescriptive Action Plan
  const prescription: StudyPrescription[] = [];
  let stepIndex = 1;

  if (stats.dueNow > 0) {
    prescription.push({
      step: stepIndex++,
      title: 'Clear Spaced Repetition Due Queue',
      action: `Review the ${stats.dueNow} due items to stabilize FSRS memory traces before memory decays further.`,
      priority: 'Immediate',
    });
  }

  if (incompleteQuizzes.length > 0) {
    const nextAssessment = incompleteQuizzes[0];
    prescription.push({
      step: stepIndex++,
      title: `Attempt ${nextAssessment.title}`,
      action: `Take ${nextAssessment.title} (${nextAssessment.subtitle}) to unlock the subsequent linear milestone.`,
      priority: 'Immediate',
    });
  }

  prescription.push({
    step: stepIndex++,
    title: 'Print High-Yield Study Sheet',
    action: 'Review the executive terminology and conceptual distinction reference sheet offline.',
    priority: 'Recommended',
  });

  prescription.push({
    step: stepIndex++,
    title: 'Simulate Comprehensive Mock Exam',
    action: 'Attempt the 35-item timed exam under strict 35-minute test conditions 24 to 48 hours before examination.',
    priority: 'Prior to Exam',
  });

  // Calculate pass likelihood text
  let passLikelihood = 'Low Likelihood (Remediation Needed)';
  if (readiness.score >= 80) {
    passLikelihood = 'High Likelihood (Estimated 88% - 96% Pass Probability)';
  } else if (readiness.score >= 65) {
    passLikelihood = 'Moderate Likelihood (Estimated 70% - 84% Pass Probability)';
  } else if (readiness.score >= 45) {
    passLikelihood = 'Developing (Estimated 50% - 65% Pass Probability)';
  }

  // Generate deterministic verification code from deck ID and date
  const verificationCode = `CAD-${deck.id.slice(0, 6).toUpperCase()}-${new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')}`;

  return {
    deckId: deck.id,
    deckTitle: deck.title,
    studentName,
    generatedDate: new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    verificationCode,
    overallReadiness: readiness.score,
    readinessLabel: readiness.label,
    passLikelihood,
    curriculumCompletionPercent: readiness.breakdown.curriculumProgress,
    averageAssessmentScore: readiness.breakdown.averageScore,
    retentionStabilityPercent: readiness.breakdown.retentionStability,
    assessmentsAudit,
    domains,
    strengths,
    weakSpots,
    prescription,
    totalCards: stats.totalCards,
    masteredCards: stats.masteredCount,
    dueCards: stats.dueNow,
  };
}
