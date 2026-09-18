import type { AssessmentProgress } from './assessments';

export interface ExamReadinessResult {
  score: number; // 0 - 100
  label: string;
  status: 'high' | 'moderate' | 'foundation';
  color: string;
  breakdown: {
    curriculumProgress: number; // %
    averageScore: number; // %
    retentionStability: number; // %
  };
}

/**
 * Calculate an authentic, non-gamified diagnostic exam readiness score
 * based on 3 pedagogical dimensions:
 * 1. Curriculum completion (40% weight)
 * 2. Historic assessment performance (35% weight)
 * 3. Memory retention stability via FSRS (25% weight)
 */
export function calculateExamReadiness(
  progressMap: Record<string, AssessmentProgress>,
  totalCards: number,
  masteredCount: number
): ExamReadinessResult {
  const assessmentKeys = Object.keys(progressMap);
  const totalAssessments = 6; // 3 Quizzes, 2 Long Quizzes, 1 Exam

  // 1. Curriculum completion
  const completedAssessments = assessmentKeys.filter(
    (key) => progressMap[key]?.completed
  );
  const completionPercent = Math.min(
    100,
    Math.round((completedAssessments.length / totalAssessments) * 100)
  );

  // 2. Average test score across taken assessments
  let averageScore = 0;
  if (completedAssessments.length > 0) {
    const totalScore = completedAssessments.reduce(
      (sum, key) => sum + (progressMap[key]?.score || 0),
      0
    );
    averageScore = Math.round(totalScore / completedAssessments.length);
  }

  // 3. FSRS Retention Stability
  const retentionPercent =
    totalCards > 0 ? Math.min(100, Math.round((masteredCount / totalCards) * 100)) : 0;

  // Weighted formula
  let compositeScore = 0;
  if (completedAssessments.length === 0) {
    compositeScore = Math.round(retentionPercent * 0.25);
  } else {
    compositeScore = Math.round(
      completionPercent * 0.4 + averageScore * 0.35 + retentionPercent * 0.25
    );
  }

  let label = 'Foundation Needed';
  let status: 'high' | 'moderate' | 'foundation' = 'foundation';
  let color = 'var(--color-text-secondary)';

  if (compositeScore >= 80) {
    label = 'High Likelihood of Passing';
    status = 'high';
    color = 'var(--color-success)';
  } else if (compositeScore >= 55) {
    label = 'On Track · Further Practice Recommended';
    status = 'moderate';
    color = '#ff9f0a';
  } else {
    label = 'In Progress · Complete Foundational Quizzes';
    status = 'foundation';
    color = 'var(--color-text-secondary)';
  }

  return {
    score: compositeScore,
    label,
    status,
    color,
    breakdown: {
      curriculumProgress: completionPercent,
      averageScore,
      retentionStability: retentionPercent,
    },
  };
}
