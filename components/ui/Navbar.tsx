'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { CadenceLogo } from './CadenceLogo';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/auth';



export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());

    const handleAuthUpdate = (e: CustomEvent) => {
      setUser(e.detail as User);
    };

    window.addEventListener('cadence_auth_updated', handleAuthUpdate as EventListener);

    return () => {
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

  const desktopNavLinks = mounted && user && !user.isGuest
    ? [
        { label: 'Dashboard', href: '/' },
        { label: 'My Decks', href: '/#decks-section', isAnchor: true },
      ]
    : [
        { label: 'Curriculum', href: '/#curriculum', isAnchor: true },
        { label: 'Methodology', href: '/#methodology', isAnchor: true },
        { label: 'Spaced Repetition', href: '/#science', isAnchor: true },
      ];

  const mobileNavLinks = mounted && user && !user.isGuest
    ? [
        { label: 'Dashboard', href: '/' },
        { label: 'My Decks', href: '/#decks-section', isAnchor: true },
        { label: '+ Create New Deck', href: '/decks/new' },
        { label: 'Profile & Settings', href: '/profile' },
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Curriculum', href: '/#curriculum', isAnchor: true },
        { label: 'Methodology', href: '/#methodology', isAnchor: true },
        { label: 'Spaced Repetition', href: '/#science', isAnchor: true },
      ];

  // Initials fallback for avatar
  const avatarDisplay = user?.avatar && user.avatar.length <= 2
    ? user.avatar
    : user?.name
      ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

  const isEmoji = user?.avatar && /\p{Emoji}/u.test(user.avatar);

  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md"
      role="banner"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Cadence home">
          <CadenceLogo size={32} />
          <span className="font-bold text-[18px] tracking-tight text-[var(--color-text)]">
            Cadence
          </span>
          <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
            AI Reviewer
          </span>
        </Link>

        {/* ── Center: Desktop Nav Links ── */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={link.isAnchor ? (e) => handleAnchorClick(e, link.href) : undefined}
              className={[
                'px-3 py-1.5 rounded-[var(--radius-sm)] text-[14px] font-medium transition-colors',
                isActive(link.href)
                  ? 'text-[var(--color-text)] underline underline-offset-4 decoration-[var(--color-text)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Right: Clean Consolidated Actions ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Action: New Deck (STRICTLY for authenticated registered users) */}
          {mounted && user && !user.isGuest && (
            <Link
              href="/decks/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] text-[13px] font-semibold hover:bg-[var(--color-btn-primary-hover)] transition-colors active:scale-95 shadow-[var(--shadow-sm)]"
              title="Create a new flashcard deck"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Deck</span>
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Auth State: Sign In / Register for Guests, Profile Avatar for Registered Students */}
          {mounted && user?.isGuest ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-[13px] font-semibold text-[var(--color-btn-primary-text)] bg-[var(--color-btn-primary-bg)] hover:bg-[var(--color-btn-primary-hover)] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          ) : mounted && user ? (
            <Link
              href="/profile"
              aria-label="Go to profile"
              title={user.name || 'Profile'}
              className={`w-11 h-11 sm:w-9 sm:h-9 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center overflow-hidden bg-[var(--color-surface)] border transition-all shrink-0 font-semibold text-[var(--color-text-secondary)] text-[15px] ${
                pathname === '/profile'
                  ? 'border-[var(--color-text)] ring-2 ring-[var(--color-focus-ring)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {isEmoji ? (
                <span className="text-[20px] leading-none">{user.avatar}</span>
              ) : (
                <span className="text-[13px] font-bold">{avatarDisplay}</span>
              )}
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--color-surface-overlay)] animate-pulse" />
          )}

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
          {mobileNavLinks.map((link) => (
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
                  ? 'text-[var(--color-text)] bg-[var(--color-surface-overlay)] font-semibold'
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
                className="flex-1 py-2 text-center text-[14px] font-semibold rounded-[var(--radius-sm)] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] hover:bg-[var(--color-btn-primary-hover)] transition-colors"
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
