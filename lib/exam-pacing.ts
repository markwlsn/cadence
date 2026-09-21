/**
 * Exam Pacing & Countdown Engine
 * Calculates days remaining until the target examination date and generates
 * realistic, actionable daily study targets (cards + quizzes per day).
 */

const STORAGE_PREFIX = 'cadence_exam_date_';

export interface ExamPacingResult {
  examDateStr: string | null;
  daysRemaining: number;
  isSet: boolean;
  isToday: boolean;
  isPast: boolean;
  dailyCardsGoal: number;
  dailyQuizzesGoal: number;
  unmasteredCards: number;
  remainingQuizzes: number;
  statusLabel: string;
  pacingSummary: string;
}

export function getDeckExamDate(deckId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${deckId}`) || null;
  } catch {
    return null;
  }
}

export function setDeckExamDate(deckId: string, dateStr: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (dateStr) {
      localStorage.setItem(`${STORAGE_PREFIX}${deckId}`, dateStr);
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${deckId}`);
    }
  } catch {
    // ignore storage errors
  }
}

export function calculatePacing(
  examDateStr: string | null,
  totalCards: number,
  masteredCards: number,
  completedQuizzes: number,
  totalQuizzes: number = 7
): ExamPacingResult {
  if (!examDateStr) {
    return {
      examDateStr: null,
      daysRemaining: 0,
      isSet: false,
      isToday: false,
      isPast: false,
      dailyCardsGoal: 0,
      dailyQuizzesGoal: 0,
      unmasteredCards: Math.max(0, totalCards - masteredCards),
      remainingQuizzes: Math.max(0, totalQuizzes - completedQuizzes),
      statusLabel: 'No Exam Date',
      pacingSummary: 'Set an exam date to generate a personalized daily pacing plan.',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = examDateStr.split('-').map((v) => parseInt(v, 10));
  const examDate = new Date(year, month - 1, day);
  examDate.setHours(0, 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isToday = daysRemaining === 0;
  const isPast = daysRemaining < 0;
  const unmasteredCards = Math.max(0, totalCards - masteredCards);
  const remainingQuizzes = Math.max(0, totalQuizzes - completedQuizzes);

  let dailyCardsGoal = 0;
  let dailyQuizzesGoal = 0;
  let statusLabel = '';
  let pacingSummary = '';

  if (isToday) {
    statusLabel = '🔥 Exam Day!';
    dailyCardsGoal = unmasteredCards;
    dailyQuizzesGoal = remainingQuizzes;
    pacingSummary = 'Today is exam day! Take the Comprehensive Exam or do a quick 1-Page Cram Sheet review.';
  } else if (isPast) {
    statusLabel = 'Exam Passed';
    pacingSummary = 'Target exam date has passed. Pick a new date to recalculate your daily pace.';
  } else if (daysRemaining === 1) {
    statusLabel = '⏳ 1 Day Left (Tomorrow)';
    dailyCardsGoal = unmasteredCards;
    dailyQuizzesGoal = remainingQuizzes;
    pacingSummary = `Exam is tomorrow! Finish the remaining ${remainingQuizzes} quiz and review ${unmasteredCards} cards.`;
  } else {
    statusLabel = `⏳ ${daysRemaining} Days Left`;
    dailyCardsGoal = Math.max(1, Math.ceil(unmasteredCards / daysRemaining));
    dailyQuizzesGoal = Math.max(1, Math.ceil(remainingQuizzes / daysRemaining));

    if (unmasteredCards === 0 && remainingQuizzes === 0) {
      pacingSummary = '🎉 100% Ready! Keep doing 5 cards/day in Mastery mode to preserve retention.';
    } else {
      pacingSummary = `Daily Goal: ${dailyQuizzesGoal} quiz + ~${dailyCardsGoal} cards/day to reach 100% readiness.`;
    }
  }

  return {
    examDateStr,
    daysRemaining,
    isSet: true,
    isToday,
    isPast,
    dailyCardsGoal,
    dailyQuizzesGoal,
    unmasteredCards,
    remainingQuizzes,
    statusLabel,
    pacingSummary,
  };
}
