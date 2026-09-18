'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { getCurrentUser } from '@/lib/auth';
import { getUserStats } from '@/lib/gamification';
import type { User } from '@/lib/auth';
import type { UserStats } from '@/lib/gamification';

const DESKTOP_NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'My Decks', href: '/#decks-section', isAnchor: true },
];

const MOBILE_NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'My Decks', href: '/#decks-section', isAnchor: true },
  { label: '+ Create New Deck', href: '/decks/new' },
  { label: 'Profile & Achievements', href: '/profile' },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    setStats(getUserStats());

    const handleStatsUpdate = (e: CustomEvent) => {
      setStats(e.detail as UserStats);
    };
    const handleAuthUpdate = (e: CustomEvent) => {
      setUser(e.detail as User);
    };

    window.addEventListener('cadence_stats_updated', handleStatsUpdate as EventListener);
    window.addEventListener('cadence_auth_updated', handleAuthUpdate as EventListener);

    return () => {
      window.removeEventListener('cadence_stats_updated', handleStatsUpdate as EventListener);
      window.removeEventListener('cadence_auth_updated', handleAuthUpdate as EventListener);
    };
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('/#', '').replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/#decks-section') return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Initials fallback for avatar
  const avatarDisplay = user?.avatar && user.avatar.length <= 2
    ? user.avatar
    : user?.name
      ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'GS';

  const isEmoji = user?.avatar && /\p{Emoji}/u.test(user.avatar);

  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md"
      role="banner"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="Cadence home">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-[15px] shadow-[var(--shadow-sm)] group-hover:scale-105 transition-transform">
            C
          </div>
          <span className="font-bold text-[18px] tracking-tight text-[var(--color-text)]">
            Cadence
          </span>
        </Link>

        {/* ── Center: Desktop Nav Links ── */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          {DESKTOP_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={link.isAnchor ? (e) => handleAnchorClick(e, link.href) : undefined}
              className={[
                'px-3 py-1.5 rounded-[var(--radius-sm)] text-[14px] font-medium transition-colors',
                isActive(link.href)
                  ? 'text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Right: Stats + Actions ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Streak */}
          {mounted && stats !== null && (
            <span
              className="text-[13px] font-bold text-amber-500 dark:text-amber-400 hidden sm:inline-flex items-center gap-0.5"
              title={`${stats.streak}-day study streak`}
            >
              🔥 {stats.streak}
            </span>
          )}

          {/* XP Level Pill */}
          {mounted && stats !== null && (
            <span
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[12px] font-semibold"
              title={`Level ${stats.level}: ${stats.title} — ${stats.xp} XP`}
            >
              ⚡ Lv.{stats.level} · {stats.xp} XP
            </span>
          )}

          {/* Quick Action: New Deck */}
          <Link
            href="/decks/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-[13px] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors active:scale-95 shadow-[var(--shadow-sm)]"
            title="Create a new flashcard deck"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Deck</span>
          </Link>

          {/* Guest Sign In Link */}
          {mounted && user?.isGuest && (
            <Link
              href="/login"
              className="hidden md:inline-block text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors px-2 py-1"
            >
              Sign In
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Avatar / Profile */}
          <Link
            href="/profile"
            aria-label="Go to profile"
            title={user?.name || 'Profile'}
            className={`w-11 h-11 sm:w-9 sm:h-9 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center overflow-hidden bg-[var(--color-surface)] border transition-all shrink-0 font-semibold text-[var(--color-text-secondary)] text-[15px] ${
              pathname === '/profile'
                ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
            }`}
          >
            {mounted && isEmoji ? (
              <span className="text-[20px] leading-none">{user?.avatar}</span>
            ) : (
              <span className="text-[13px] font-bold">{mounted ? avatarDisplay : '—'}</span>
            )}
          </Link>

          {/* Mobile Hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] transition-colors"
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {/* Mobile stats row */}
          {mounted && stats !== null && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <span className="text-[13px] font-bold text-amber-500 dark:text-amber-400">
                🔥 {stats.streak} day streak
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[12px] font-semibold">
                ⚡ Lv.{stats.level} · {stats.xp} XP
              </span>
            </div>
          )}
          {MOBILE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => {
                if (link.isAnchor) handleAnchorClick(e, link.href);
                setMobileOpen(false);
              }}
              className={[
                'px-3 py-2.5 rounded-[var(--radius-sm)] text-[15px] font-medium transition-colors',
                isActive(link.href)
                  ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/8 font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}

          {/* Guest Sign In / Register Prompt in Mobile Menu */}
          {mounted && user?.isGuest && (
            <div className="pt-3 mt-1 border-t border-[var(--color-border)] flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 py-2 text-center text-[14px] font-medium rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 py-2 text-center text-[14px] font-semibold rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
