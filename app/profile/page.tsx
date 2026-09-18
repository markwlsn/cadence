'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  updateUserProfile,
  logoutUser,
  deleteAccountAndData,
  AVATAR_OPTIONS,
  type User,
} from '@/lib/auth';
import { ThemeToggle, BackButton, Button } from '@/components/ui';

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎓');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser.isGuest) {
      router.replace('/login');
      return;
    }
    setUser(currentUser);
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone || '');
    setEditAge(currentUser.age !== undefined ? String(currentUser.age) : '');
    setSelectedAvatar(currentUser.avatar);
  }, [router]);

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
    if (
      typeof window !== 'undefined' &&
      window.confirm(
        'Are you sure you want to delete your account and erase all study decks and assessment progress? This action cannot be undone.'
      )
    ) {
      deleteAccountAndData();
      router.push('/login');
    }
  };

  if (!mounted || !user || user.isGuest) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-text)] border-t-transparent animate-spin" />
          <p className="text-[15px] text-[var(--color-text-secondary)]">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <BackButton href="/" label="Dashboard" />
          <h1 className="text-[17px] font-semibold text-[var(--color-text)]">Account &amp; Profile</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-6 pb-28 md:py-8 space-y-8">
        {/* Hero / Avatar Section */}
        <section className="flex flex-col items-center gap-4 pt-2">
          <div className="w-20 h-20 rounded-[var(--radius-lg)] flex items-center justify-center text-[48px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-md)]">
            {selectedAvatar}
          </div>

          <div className="text-center">
            <h2 className="text-[24px] font-bold text-[var(--color-text)] tracking-tight">
              {user.name}
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
              {user.email || 'Registered Student'}
            </p>
          </div>
        </section>

        {/* Student Details Form Card */}
        <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-5">
          <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
            Student Information
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="editName" className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                Full Name
              </label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text)] text-[15px] focus:outline-none focus:border-[var(--color-text)] transition-colors"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="editEmail" className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                Email Address
              </label>
              <input
                id="editEmail"
                type="email"
                disabled
                value={user.email || 'guest@cadence.app'}
                className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text-secondary)] opacity-70 text-[15px] cursor-not-allowed"
              />
            </div>

            {/* Demographic row: Age & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editAge" className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                  Age
                </label>
                <input
                  id="editAge"
                  type="number"
                  placeholder="e.g. 21"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text)] text-[15px] focus:outline-none focus:border-[var(--color-text)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="editPhone" className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                  Phone Number
                </label>
                <input
                  id="editPhone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text)] text-[15px] focus:outline-none focus:border-[var(--color-text)] transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Avatar Picker Section */}
        <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] space-y-4">
          <div>
            <h3 className="text-[14px] font-bold text-[var(--color-text)] uppercase tracking-wider">
              Student Avatar
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              Select an icon to represent your study account.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3 max-w-sm">
            {AVATAR_OPTIONS.map((emoji) => {
              const isSelected = selectedAvatar === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  aria-label={`Select avatar ${emoji}`}
                  aria-pressed={isSelected}
                  className={`h-14 rounded-[var(--radius-md)] text-[26px] flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] ring-2 ring-[var(--color-focus-ring)] shadow-sm scale-105'
                      : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </section>

        {/* Save & Action Buttons */}
        <section className="pt-2 flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={isSaving}
            className="w-full font-bold text-[15px]"
          >
            {saveSuccess ? '✓ Changes Saved' : 'Save Changes'}
          </Button>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleSignOut}
              className="flex-1"
            >
              Sign Out
            </Button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="flex-1 px-4 py-2 rounded-[var(--radius-md)] border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-[14px] font-semibold cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}