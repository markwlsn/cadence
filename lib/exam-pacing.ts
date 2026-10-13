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

export type ExamDateValidationResult =
  | { valid: true; date: Date | null; isoString: string | null; error?: undefined; status?: undefined }
  | { valid: false; error: string; status: 400; date?: undefined; isoString?: undefined };

/**
 * Validates an exam date input for persistence.
 * Accepts null (to clear date) or a valid ISO/calendar date string.
 * Rejects non-strings, malformed dates, past dates (< today), and dates > 3 years in the future.
 * Normalized to UTC midnight of the target calendar date.
 */
export function validateExamDate(
  input: unknown,
  now: Date = new Date()
): ExamDateValidationResult {
  if (input === null) {
    return { valid: true, date: null, isoString: null };
  }

  if (typeof input !== 'string') {
    return {
      valid: false,
      error: 'Exam date must be an ISO date string or null.',
      status: 400,
    };
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return {
      valid: false,
      error: 'Exam date cannot be empty.',
      status: 400,
    };
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  let year: number;
  let month: number;
  let day: number;

  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return {
        valid: false,
        error: 'Invalid date format. Expected valid ISO date string.',
        status: 400,
      };
    }
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth() + 1;
    day = parsed.getUTCDate();
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    isNaN(utcDate.getTime()) ||
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return {
      valid: false,
      error: 'Invalid calendar date.',
      status: 400,
    };
  }

  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();
  const nowDay = now.getUTCDate();
  const todayUtcMidnight = new Date(Date.UTC(nowYear, nowMonth, nowDay, 0, 0, 0, 0));

  if (utcDate.getTime() < todayUtcMidnight.getTime()) {
    return {
      valid: false,
      error: 'Exam date cannot be in the past.',
      status: 400,
    };
  }

  const maxFutureDate = new Date(Date.UTC(nowYear + 3, nowMonth, nowDay, 0, 0, 0, 0));
  if (utcDate.getTime() > maxFutureDate.getTime()) {
    return {
      valid: false,
      error: 'Exam date cannot be more than 3 years in the future.',
      status: 400,
    };
  }

  return {
    valid: true,
    date: utcDate,
    isoString: utcDate.toISOString(),
  };
}

/**
 * Counts calendar days until the target exam date in the user's local timezone.
 * Exam day itself = 0, past = negative, future = positive.
 */
export function daysUntilExam(
  examDate: string | Date,
  now: string | Date = new Date(),
  timezoneOffsetMinutes: number = 0
): number {
  const nowDate = typeof now === 'string' ? new Date(now) : now;
  const nowLocalMs = nowDate.getTime() + timezoneOffsetMinutes * 60 * 1000;
  const nowDayIndex = Math.floor(nowLocalMs / (24 * 60 * 60 * 1000));

  let examDayIndex: number;
  if (typeof examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(examDate.trim())) {
    const [y, m, d] = examDate.trim().split('-').map(Number);
    examDayIndex = Math.floor(Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000));
  } else {
    const eDate = typeof examDate === 'string' ? new Date(examDate) : examDate;
    examDayIndex = Math.floor(
      Date.UTC(eDate.getUTCFullYear(), eDate.getUTCMonth(), eDate.getUTCDate()) / (24 * 60 * 60 * 1000)
    );
  }

  return examDayIndex - nowDayIndex;
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
