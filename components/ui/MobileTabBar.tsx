'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, type User } from '@/lib/auth';

export function MobileTabBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());

    const handleAuth = (e: CustomEvent) => setUser(e.detail as User);
    window.addEventListener('cadence_auth_updated', handleAuth as EventListener);
    return () => {
      window.removeEventListener('cadence_auth_updated', handleAuth as EventListener);
    };
  }, []);

  // Hide tab bar on active review sessions for maximum full-screen focus
  if (pathname.includes('/review')) {
    return null;
  }

  const isAuthenticated = mounted && user && !user.isGuest;

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === '/' && href.includes('#')) {
      e.preventDefault();
      const targetId = href.split('#')[1];
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isTabActive = (href: string) => {
    if (href === '/#decks-section' || href === '/#curriculum' || href === '/#methodology') {
      return false;
    }
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="Mobile Application Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-xl transition-all duration-200"
      style={{
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
        paddingTop: '6px',
      }}
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around">
        {isAuthenticated ? (
          /* ── Authenticated Student Tabs ── */
          <>
            {/* 1. Today / Dashboard */}
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] transition-all active:scale-95 ${
                isTabActive('/')
                  ? 'text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/') ? '2.4' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-[10px] tracking-tight">Today</span>
            </Link>

            {/* 2. My Decks */}
            <Link
              href="/#decks-section"
              onClick={(e) => handleAnchorClick(e, '/#decks-section')}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h10" />
                <path d="M7 12h10" />
                <path d="M7 17h10" />
              </svg>
              <span className="text-[10px] tracking-tight">Decks</span>
            </Link>

            {/* 3. + Create (Elevated Action Button) */}
            <Link
              href="/decks/new"
              className="flex flex-col items-center gap-1 py-0.5 px-3 transition-all active:scale-90"
              title="Create New Deck"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] flex items-center justify-center shadow-md border border-[var(--color-border)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-text)] tracking-tight">Create</span>
            </Link>

            {/* 4. Mistake Notebook */}
            <Link
              href="/notebook"
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-[var(--radius-sm)] transition-all active:scale-95 ${
                isTabActive('/notebook')
                  ? 'text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/notebook') ? '2.4' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <span className="text-[10px] tracking-tight">Notebook</span>
            </Link>

            {/* 5. Profile / Account */}
            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-[var(--radius-sm)] transition-all active:scale-95 ${
                isTabActive('/profile')
                  ? 'text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/profile') ? '2.4' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-[10px] tracking-tight">Account</span>
            </Link>
          </>
        ) : (
          /* ── Unauthenticated / Landing Page Tabs ── */
          <>
            {/* 1. Welcome */}
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] transition-all active:scale-95 ${
                isTabActive('/')
                  ? 'text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/') ? '2.4' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-[10px] tracking-tight">Welcome</span>
            </Link>

            {/* 2. Curriculum */}
            <Link
              href="/#curriculum"
              onClick={(e) => handleAnchorClick(e, '/#curriculum')}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2f" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span className="text-[10px] tracking-tight">Curriculum</span>
            </Link>

            {/* 3. Methodology */}
            <Link
              href="/#methodology"
              onClick={(e) => handleAnchorClick(e, '/#methodology')}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 15 5-3-5-3v6Z" />
              </svg>
              <span className="text-[10px] tracking-tight">AI Review</span>
            </Link>

            {/* 4. Sign In */}
            <Link
              href="/login"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[var(--radius-sm)] transition-all active:scale-95 ${
                isTabActive('/login')
                  ? 'text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/login') ? '2.4' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className="text-[10px] tracking-tight">Sign In</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
