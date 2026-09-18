'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, updateUserProfile, logoutUser, deleteAccountAndData, AVATAR_OPTIONS, type User } from '@/lib/auth';
import { getUserStats, updateDailyGoal, ALL_BADGES, getLevelDetails, type UserStats } from '@/lib/gamification';
import { ThemeToggle, BackButton } from '@/components/ui';

const GOAL_OPTIONS = [10, 20, 30] as const;

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎓');
  const [selectedGoal, setSelectedGoal] = useState<number>(20);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    const currentStats = getUserStats();
    setUser(currentUser);
    setStats(currentStats);
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone || '');
    setEditAge(currentUser.age !== undefined ? String(currentUser.age) : '');
    setSelectedAvatar(currentUser.avatar);
    setSelectedGoal(currentStats.dailyGoal);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const parsedAge = editAge.trim() ? Number(editAge) : undefined;
      const updated = updateUserProfile({
        name: editName.trim() || user.name,
        avatar: selectedAvatar,
        phone: editPhone.trim() || undefined,
        age: parsedAge && !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : undefined,
      });
      updateDailyGoal(selectedGoal);
      setUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    logoutUser();
    router.push('/login');
  };

  const handleDeleteAccount = () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete your account and erase all study statistics? This action cannot be undone.')) {
      deleteAccountAndData();
      router.push('/login');
    }
  };

  if (!mounted || !user || !stats) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none" aria-label="Loading" className="animate-spin">
            <circle cx="8" cy="8" r="6" stroke="var(--color-border-strong)" strokeWidth="2"/>
            <path d="M14 8a6 6 0 0 0-6-6" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-[15px] text-[var(--color-text-secondary)]">Loading profile…</p>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelDetails(stats.xp);
  const xpInLevel = stats.xp - (
    levelInfo.level === 1 ? 0 :
    levelInfo.level === 2 ? 500 :
    levelInfo.level === 3 ? 1200 :
    levelInfo.level === 4 ? 2200 :
    levelInfo.level === 5 ? 3500 : 5000
  );
  const xpForLevel = (levelInfo.nextLevelXP === 999999 ? stats.xp : levelInfo.nextLevelXP) - (
    levelInfo.level === 1 ? 0 :
    levelInfo.level === 2 ? 500 :
    levelInfo.level === 3 ? 1200 :
    levelInfo.level === 4 ? 2200 :
    levelInfo.level === 5 ? 3500 : 5000
  );

  const unlockedBadgeIds = new Set(stats.badges.map((b) => b.id));

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <BackButton href="/" label="Dashboard" />
          <h1 className="text-[17px] font-semibold text-[var(--color-text)]">Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Guest banner */}
        {user.isGuest && (
          <div
            role="region"
            aria-label="Guest account notice"
            className="p-4 rounded-[var(--radius-md)] flex items-start gap-3 mb-6"
            style={{
              background: 'rgba(255, 159, 10, 0.08)',
              border: '1px solid rgba(255, 159, 10, 0.25)',
            }}
          >
            <span className="text-[20px] flex-shrink-0 leading-none">⚠️</span>
            <div>
              <p className="text-[14px] font-medium text-[var(--color-text)] leading-snug">
                {'You\'re studying as a guest.'}
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
                {'Register to save your progress permanently. '}
                <Link href="/register" className="text-[var(--color-text)] font-semibold underline underline-offset-4 hover:opacity-80">
                  Create account →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ── Hero / Avatar section ──────────────────────────────── */}
        <section className="mt-8 flex flex-col items-center gap-4">
          {/* Big avatar */}
          <div
            className="w-20 h-20 rounded-[var(--radius-lg)] flex items-center justify-center text-[48px] shadow-[var(--shadow-md)]"
            style={{ background: 'var(--color-surface)' }}
          >
            {selectedAvatar}
          </div>

          {/* Editable name */}
          <div className="relative">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-[24px] font-bold text-[var(--color-text)] text-center bg-transparent border-b-2 border-transparent focus:border-[var(--color-text)] focus:outline-none transition-colors px-2 pb-0.5 max-w-[240px]"
              aria-label="Your name"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-tertiary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute -right-1 top-1.5 pointer-events-none"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>

          {/* Level badge */}
          <div className="flex items-center gap-2">
            <span
              className="px-3.5 py-1 rounded-full text-[13px] font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
            >
              Lv. {levelInfo.level} · {levelInfo.title}
            </span>
          </div>

          {/* XP progress bar */}
          <div className="w-full max-w-xs flex flex-col gap-2">
            <div className="flex justify-between text-[12px] text-[var(--color-text-secondary)]">
              <span>{stats.xp.toLocaleString()} XP</span>
              <span>{levelInfo.nextLevelXP === 999999 ? 'Max level' : `${levelInfo.nextLevelXP.toLocaleString()} XP next`}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--color-surface)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-[var(--color-text)]"
                style={{
                  width: levelInfo.nextLevelXP === 999999 ? '100%' : `${Math.min(100, Math.round((xpInLevel / xpForLevel) * 100))}%`,
                }}
              />
            </div>
            <p className="text-center text-[12px] text-[var(--color-text-tertiary)]">
              {levelInfo.nextLevelXP === 999999
                ? 'You\'ve reached the highest level!'
                : `${xpInLevel} / ${xpForLevel} XP to level ${levelInfo.level + 1}`}
            </p>
          </div>
        </section>

        {/* ── Stats grid ─────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Your Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🔥', label: 'Day Streak', value: stats.streak },
              { icon: '⚡', label: 'Total XP', value: stats.xp.toLocaleString() },
              { icon: '⭐', label: 'Stars Earned', value: stats.totalStars },
              { icon: '📚', label: 'Cards Reviewed', value: stats.totalCardsReviewed },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="p-4 rounded-[var(--radius-md)] flex flex-col gap-1"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-[24px] leading-none">{icon}</span>
                <p className="text-[22px] font-bold text-[var(--color-text)] mt-1">{value}</p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Daily Goal ─────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Daily Goal
          </h2>
          <div
            className="p-4 rounded-[var(--radius-md)]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-3">
              How many cards do you want to study each day?
            </p>
            <div className="flex gap-3">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setSelectedGoal(goal)}
                  aria-pressed={selectedGoal === goal}
                  className="flex-1 h-12 rounded-[var(--radius-md)] font-semibold text-[15px] transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: selectedGoal === goal ? 'var(--color-btn-primary-bg)' : 'var(--color-bg)',
                    color: selectedGoal === goal ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
                    border: selectedGoal === goal ? '2px solid var(--color-btn-primary-bg)' : '2px solid var(--color-border)',
                  }}
                >
                  {goal}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[var(--color-text-tertiary)] text-center mt-3">
              cards per day
            </p>
          </div>
        </section>

        {/* ── Avatar Picker ──────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Change Avatar
          </h2>
          <div
            className="p-4 rounded-[var(--radius-md)]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  aria-label={`Select avatar ${emoji}`}
                  aria-pressed={selectedAvatar === emoji}
                  className="h-12 rounded-[var(--radius-md)] flex items-center justify-center text-[22px] transition-all active:scale-90 cursor-pointer"
                  style={{
                    background: selectedAvatar === emoji ? 'var(--color-surface-overlay)' : 'var(--color-bg)',
                    border: selectedAvatar === emoji ? '2px solid var(--color-text)' : '2px solid transparent',
                    boxShadow: selectedAvatar === emoji ? '0 0 0 2px var(--color-border-strong)' : 'none',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Student & Demographic Information ──────────────────── */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Personal & Demographic Details
          </h2>
          <div
            className="p-4 rounded-[var(--radius-md)] flex flex-col gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {/* Email (read-only) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-email" className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  value={user.email || 'Guest Scholar (No email linked)'}
                  disabled
                  className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[16px] cursor-not-allowed opacity-80"
                />
                {user.isGuest ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Guest Session
                  </span>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Registered Account
                  </span>
                )}
              </div>
            </div>

            {/* Phone & Age grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-phone" className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Phone Number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px var(--color-focus-ring)'; e.target.style.borderColor = 'var(--color-text)'; }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
                />
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-age" className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Age
                </label>
                <input
                  id="profile-age"
                  type="number"
                  min={5}
                  max={120}
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px var(--color-focus-ring)'; e.target.style.borderColor = 'var(--color-text)'; }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Achievements ───────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Achievements
          </h2>
          <div className="flex flex-col gap-2">
            {ALL_BADGES.map((badge) => {
              const isUnlocked = unlockedBadgeIds.has(badge.id);
              const earned = stats.badges.find((b) => b.id === badge.id);
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] transition-opacity"
                  style={{
                    background: 'var(--color-surface)',
                    border: isUnlocked ? '1px solid var(--color-border)' : '1px solid var(--color-border)',
                    opacity: isUnlocked ? 1 : 0.45,
                    filter: isUnlocked ? 'none' : 'grayscale(100%)',
                  }}
                >
                  <span className="text-[32px] flex-shrink-0 leading-none">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--color-text)]">{badge.title}</p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">{badge.description}</p>
                    {isUnlocked && earned?.unlockedAt && (
                      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                        Earned {new Date(earned.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {isUnlocked ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(52,199,89,0.15)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--color-surface-overlay)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Actions ────────────────────────────────────────────── */}
        <section className="mt-8 flex flex-col gap-3">
          {/* Save Changes */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-[var(--radius-md)] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] font-semibold text-[16px] flex items-center justify-center gap-2 hover:bg-[var(--color-btn-primary-hover)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[var(--shadow-sm)] cursor-pointer"
          >
            {isSaving ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="animate-spin">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
                  <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Saving…
              </>
            ) : saveSuccess ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full h-12 rounded-[var(--radius-md)] bg-transparent border border-[var(--color-border)] text-[var(--color-danger)] font-semibold text-[16px] flex items-center justify-center gap-2 hover:bg-[var(--color-danger)]/5 hover:border-[var(--color-danger)]/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>

          {/* Delete Account & Purge Data (Apple App Store Guideline 5.1.1(v)) */}
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full text-center text-[13px] text-[var(--color-danger)] opacity-70 hover:opacity-100 hover:underline py-2 transition-opacity cursor-pointer"
          >
            Delete Account & Erase All Data
          </button>
        </section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </main>
    </div>
  );
}