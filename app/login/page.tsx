'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, continueAsGuest } from '@/lib/auth';
import { ThemeToggle, BackButton } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Sign in failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    setIsGuestLoading(true);
    try {
      continueAsGuest();
      router.push('/');
    } catch {
      setError('Failed to start guest session.');
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex bg-[var(--color-bg)]">
      {/* Left Hero Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] min-h-dvh p-12 relative overflow-hidden border-r border-[var(--color-border)]"
        style={{
          background: 'linear-gradient(160deg, #111111 0%, #1c1c1e 60%, #2c2c2e 100%)',
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[20px] bg-white text-black shadow-sm"
          >
            C
          </div>
          <span className="text-white font-bold text-[22px] tracking-tight">Cadence</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-white font-bold text-[48px] leading-tight tracking-tight mb-4">
            Study smarter<br />with AI
          </h1>
          <p className="text-white/80 text-[18px] mb-10 leading-relaxed">
            Adaptive flashcards that know exactly what you need to review and when.
          </p>
          <ul className="flex flex-col gap-5">
            {[
              { icon: '🧠', label: 'AI-generated cards from your notes' },
              { icon: '🔥', label: 'Daily streaks to keep momentum' },
              { icon: '⭐', label: 'Track your mastery over time' },
            ].map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-4">
                <span
                  className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-[20px] flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  {icon}
                </span>
                <span className="text-white/90 text-[16px] font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/50 text-[13px] relative z-10">
          Cadence {new Date().getFullYear()}
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col min-h-dvh relative">
        <header className="w-full flex items-center justify-between px-6 sm:px-8 pt-6 z-10">
          <BackButton href="/" label="Back to Home" />
          <ThemeToggle />
        </header>

        <div className="flex-1 flex flex-col justify-center px-8 py-10 max-w-md mx-auto w-full">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] flex items-center justify-center font-bold text-[16px]">
              C
            </div>
            <span className="font-bold text-[19px] tracking-tight text-[var(--color-text)]">Cadence</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[32px] font-bold tracking-tight text-[var(--color-text)] mb-2">
              Welcome back
            </h2>
            <p className="text-[16px] text-[var(--color-text-secondary)]">
              Sign in to continue your study journey
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px var(--color-focus-ring)'; e.target.style.borderColor = 'var(--color-text)'; }}
                onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px var(--color-focus-ring)'; e.target.style.borderColor = 'var(--color-text)'; }}
                  onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors rounded-[var(--radius-sm)]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)]"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-[14px] leading-snug" style={{ color: 'var(--color-danger)' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGuestLoading}
              className="w-full h-12 mt-1 rounded-[var(--radius-md)] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] font-semibold text-[16px] flex items-center justify-center gap-2 hover:bg-[var(--color-btn-primary-hover)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-sm)]"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <button
            type="button"
            onClick={handleGuest}
            disabled={isLoading || isGuestLoading}
            className="w-full h-12 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-[16px] flex items-center justify-center gap-2.5 hover:bg-[var(--color-surface-overlay)] hover:border-[var(--color-border-strong)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGuestLoading ? (
              <>
                <DarkSpinner />
                <span>Starting…</span>
              </>
            ) : (
              <>
                <span className="text-[20px] leading-none">🎓</span>
                <span>Continue as Guest</span>
              </>
            )}
          </button>

          <p className="text-center text-[14px] text-[var(--color-text-secondary)] mt-8">
            {'Don\'t have an account? '}
            <Link href="/register" className="text-[var(--color-text)] font-semibold underline underline-offset-4 hover:opacity-80">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="animate-spin flex-shrink-0">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function DarkSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="animate-spin flex-shrink-0">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}