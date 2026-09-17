'use client';

/**
 * Gamification Engine for Cadence
 * Manages XP, Levels, Titles, Daily Streaks, Stars, Daily Goals, and Achievements.
 */

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserStats {
  xp: number;
  level: number;
  title: string;
  nextLevelXP: number;
  levelProgressPercent: number;
  streak: number;
  lastStudiedDate?: string;
  todayStudiedCount: number;
  dailyGoal: number;
  totalCardsReviewed: number;
  totalStars: number;
  badges: Badge[];
}

export const ALL_BADGES: Badge[] = [
  {
    id: 'first_session',
    title: 'First Step',
    description: 'Completed your first study session',
    icon: '🌱',
  },
  {
    id: 'streak_3',
    title: 'Streak Starter',
    description: 'Maintained a 3-day study streak',
    icon: '🔥',
  },
  {
    id: 'streak_7',
    title: 'Unstoppable',
    description: 'Reached a 7-day study streak',
    icon: '⚡',
  },
  {
    id: 'accuracy_100',
    title: 'Bullseye',
    description: 'Scored 100% accuracy in a review session',
    icon: '🎯',
  },
  {
    id: 'cards_50',
    title: 'Knowledge Seeker',
    description: 'Reviewed 50 cards total',
    icon: '📚',
  },
  {
    id: 'code_wizard',
    title: 'Syntax Master',
    description: 'Solved a code fill-in-the-blank card',
    icon: '💻',
  },
  {
    id: 'stars_10',
    title: 'Constellation',
    description: 'Earned 10 stars across study sessions',
    icon: '⭐',
  },
];

const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Novice Scholar', minXP: 0, maxXP: 500 },
  { level: 2, title: 'Curious Apprentice', minXP: 500, maxXP: 1200 },
  { level: 3, title: 'Active Thinker', minXP: 1200, maxXP: 2500 },
  { level: 4, title: 'Memory Master', minXP: 2500, maxXP: 4500 },
  { level: 5, title: 'Academic Prodigy', minXP: 4500, maxXP: 7500 },
  { level: 6, title: 'Grandmaster of Recall', minXP: 7500, maxXP: 999999 },
];

export function getLevelDetails(xp: number) {
  let currentTier = LEVEL_THRESHOLDS[0];
  for (const tier of LEVEL_THRESHOLDS) {
    if (xp >= tier.minXP) {
      currentTier = tier;
    }
  }

  const range = currentTier.maxXP - currentTier.minXP;
  const progress = Math.min(100, Math.max(0, Math.round(((xp - currentTier.minXP) / range) * 100)));

  return {
    level: currentTier.level,
    title: currentTier.title,
    nextLevelXP: currentTier.maxXP,
    levelProgressPercent: progress,
  };
}

export function calculateSessionStars(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

const STORAGE_KEY = 'cadence_user_stats';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function getUserStats(): UserStats {
  if (typeof window === 'undefined') {
    return {
      xp: 350,
      level: 1,
      title: 'Novice Scholar',
      nextLevelXP: 500,
      levelProgressPercent: 70,
      streak: 3,
      todayStudiedCount: 5,
      dailyGoal: 20,
      totalCardsReviewed: 28,
      totalStars: 6,
      badges: [ALL_BADGES[0]],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default initial state for a student
      const initial: UserStats = {
        xp: 280,
        level: 1,
        title: 'Novice Scholar',
        nextLevelXP: 500,
        levelProgressPercent: 56,
        streak: 2,
        lastStudiedDate: getTodayString(),
        todayStudiedCount: 8,
        dailyGoal: 20,
        totalCardsReviewed: 24,
        totalStars: 5,
        badges: [
          { ...ALL_BADGES[0], unlockedAt: new Date().toISOString() },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const data = JSON.parse(raw) as UserStats;
    const today = getTodayString();

    // Check if daily count needs resetting
    if (data.lastStudiedDate !== today) {
      data.todayStudiedCount = 0;
    }

    const levelInfo = getLevelDetails(data.xp);
    return {
      ...data,
      ...levelInfo,
      badges: data.badges || [ALL_BADGES[0]],
    };
  } catch {
    return {
      xp: 0,
      level: 1,
      title: 'Novice Scholar',
      nextLevelXP: 500,
      levelProgressPercent: 0,
      streak: 1,
      todayStudiedCount: 0,
      dailyGoal: 20,
      totalCardsReviewed: 0,
      totalStars: 0,
      badges: [],
    };
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    const levelInfo = getLevelDetails(stats.xp);
    const updated = {
      ...stats,
      ...levelInfo,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cadence_stats_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save user stats', e);
  }
}

/**
 * Award XP and update streak when a card or session is completed
 */
export function recordCardReview(options: {
  isCorrect: boolean;
  cardType: 'basic' | 'cloze' | 'mcq';
  isCode?: boolean;
}): { earnedXP: number; newTotalXP: number; leveledUp: boolean } {
  const current = getUserStats();
  const oldLevel = current.level;

  let earnedXP = 15; // Base XP for completing recall
  if (options.isCorrect) {
    if (options.cardType === 'cloze') {
      earnedXP += options.isCode ? 85 : 65; // +100 or +80 for cloze
    } else if (options.cardType === 'mcq') {
      earnedXP += 60; // +75 for MCQ
    } else {
      earnedXP += 45; // +60 for Basic
    }
  }

  const today = getTodayString();
  const yesterday = getYesterdayString();

  let streak = current.streak || 1;
  if (current.lastStudiedDate === yesterday) {
    streak += 1;
  } else if (current.lastStudiedDate !== today && current.lastStudiedDate) {
    // missed a day
    streak = 1;
  }

  const newXP = current.xp + earnedXP;
  const newLevelInfo = getLevelDetails(newXP);
  const leveledUp = newLevelInfo.level > oldLevel;

  const updatedStats: UserStats = {
    ...current,
    xp: newXP,
    streak,
    lastStudiedDate: today,
    todayStudiedCount: (current.todayStudiedCount || 0) + 1,
    totalCardsReviewed: (current.totalCardsReviewed || 0) + 1,
    ...newLevelInfo,
  };

  // Check badges
  const unlockedBadgeIds = new Set(updatedStats.badges.map((b) => b.id));
  if (updatedStats.streak >= 3 && !unlockedBadgeIds.has('streak_3')) {
    const b = ALL_BADGES.find((b) => b.id === 'streak_3');
    if (b) updatedStats.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }
  if (updatedStats.streak >= 7 && !unlockedBadgeIds.has('streak_7')) {
    const b = ALL_BADGES.find((b) => b.id === 'streak_7');
    if (b) updatedStats.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }
  if (updatedStats.totalCardsReviewed >= 50 && !unlockedBadgeIds.has('cards_50')) {
    const b = ALL_BADGES.find((b) => b.id === 'cards_50');
    if (b) updatedStats.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }
  if (options.isCode && options.isCorrect && !unlockedBadgeIds.has('code_wizard')) {
    const b = ALL_BADGES.find((b) => b.id === 'code_wizard');
    if (b) updatedStats.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }

  saveUserStats(updatedStats);

  return {
    earnedXP,
    newTotalXP: newXP,
    leveledUp,
  };
}

/**
 * Record session completion: awards stars and session bonuses
 */
export function recordSessionCompletion(accuracy: number, cardsCount: number): {
  starsEarned: 1 | 2 | 3;
  bonusXP: number;
} {
  const current = getUserStats();
  const starsEarned = calculateSessionStars(accuracy);
  const bonusXP = starsEarned * 50; // 50, 100, or 150 bonus XP

  const newTotalStars = (current.totalStars || 0) + starsEarned;
  const newXP = current.xp + bonusXP;
  const newLevelInfo = getLevelDetails(newXP);

  const updated: UserStats = {
    ...current,
    xp: newXP,
    totalStars: newTotalStars,
    ...newLevelInfo,
  };

  const unlockedBadgeIds = new Set(updated.badges.map((b) => b.id));
  if (accuracy === 1.0 && cardsCount >= 3 && !unlockedBadgeIds.has('accuracy_100')) {
    const b = ALL_BADGES.find((b) => b.id === 'accuracy_100');
    if (b) updated.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }
  if (newTotalStars >= 10 && !unlockedBadgeIds.has('stars_10')) {
    const b = ALL_BADGES.find((b) => b.id === 'stars_10');
    if (b) updated.badges.push({ ...b, unlockedAt: new Date().toISOString() });
  }

  saveUserStats(updated);

  return {
    starsEarned,
    bonusXP,
  };
}

export function updateDailyGoal(newGoal: number): void {
  const current = getUserStats();
  saveUserStats({
    ...current,
    dailyGoal: newGoal,
  });
}
