import { type AssessmentProgress, ASSESSMENT_CONFIGS } from './assessments';

export interface ExamReadinessResult {
  score: number; // 0 - 100
  label: string;
  status: 'high' | 'moderate' | 'foundation';
  color: string;
  breakdown: {
    curriculumProgress: number; // %
    averageScore: number; // %
    retentionStability: number; // %
    completedCount: number;
    totalCount: number;
  };
}

/**
 * Calculate intuitive, encouraging study progress and exam readiness.
 * Accurately tracks completed quizzes, test scores, and card mastery.
 */
export function calculateExamReadiness(
  progressMap: Record<string, AssessmentProgress>,
  totalCards: number,
  masteredCount: number
): ExamReadinessResult {
  const assessmentKeys = Object.keys(progressMap);
  const totalAssessments = Math.max(ASSESSMENT_CONFIGS.length, 1); // 4 Quizzes, 2 Long Quizzes, 1 Comprehensive Exam (7 total)

  // 1. Quizzes completed
  const completedAssessments = assessmentKeys.filter(
    (key) => progressMap[key]?.completed
  );
  const completedCount = completedAssessments.length;
  const completionPercent = Math.min(
    100,
    Math.round((completedCount / totalAssessments) * 100)
  );

  // 2. Average test score across taken assessments
  let averageScore = 0;
  if (completedCount > 0) {
    const scoredAssessments = completedAssessments.filter(
      (key) => typeof progressMap[key]?.score === 'number' && progressMap[key].score > 0
    );
    if (scoredAssessments.length > 0) {
      const totalScore = scoredAssessments.reduce(
        (sum, key) => sum + (progressMap[key]?.score || 0),
        0
      );
      averageScore = Math.round(totalScore / scoredAssessments.length);
    }
  }

  // 3. Flashcard mastery
  const retentionPercent =
    totalCards > 0 ? Math.min(100, Math.round((masteredCount / totalCards) * 100)) : 0;

  // Composite study progress score
  let compositeScore = 0;
  if (completedCount === 0) {
    // If no quizzes taken yet, reflect flashcard mastery if any
    compositeScore = retentionPercent;
  } else if (completedCount >= totalAssessments) {
    // If all quizzes completed, score is their overall quiz mastery score
    compositeScore = averageScore > 0 ? averageScore : 100;
  } else {
    // In progress: primary progress is quizzes completed, boosted if scoring well
    if (averageScore > 0) {
      compositeScore = Math.min(100, Math.round(completionPercent * 0.7 + averageScore * 0.3));
    } else {
      compositeScore = completionPercent;
    }
  }

  let label = 'Ready to Start · Take Quiz 1';
  let status: 'high' | 'moderate' | 'foundation' = 'foundation';
  let color = 'var(--color-text)';

  if (completedCount >= totalAssessments && compositeScore >= 75) {
    label = 'Ready for Exam · Great Job! 🎉';
    status = 'high';
    color = 'var(--color-success)';
  } else if (completedCount >= 4 || compositeScore >= 50) {
    const nextNum = Math.min(completedCount + 1, totalAssessments);
    label = nextNum <= 4 ? `On Track · Next: Short Quiz ${nextNum}` : nextNum <= 6 ? `On Track · Next: Long Quiz ${nextNum - 4}` : 'On Track · Next: Final Exam';
    status = 'moderate';
    color = '#ff9f0a';
  } else if (completedCount > 0) {
    const nextNum = Math.min(completedCount + 1, totalAssessments);
    label = nextNum <= 4 ? `Making Progress · Next: Short Quiz ${nextNum}` : `Making Progress · Next: Quiz ${nextNum}`;
    status = 'foundation';
    color = 'var(--color-text)';
  } else {
    label = 'Ready to Start · Take Quiz 1';
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
      completedCount,
      totalCount: totalAssessments,
    },
  };
}
