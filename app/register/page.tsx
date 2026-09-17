'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, continueAsGuest, AVATAR_OPTIONS } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui';

function getPasswordStrength(password: string): { label: string; color: string; width: string; level: number } {
  if (password.length === 0) return { label: '', color: '', width: '0%', level: 0 };
  if (password.length < 6) return { label: 'Too short', color: '#ff3b30', width: '20%', level: 1 };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  if (password.length >= 8 && score >= 3) return { label: 'Strong', color: '#34c759', width: '100%', level: 3 };
  if (password.length >= 6 && score >= 2) return { label: 'Medium', color: '#ff9f0a', width: '60%', level: 2 };
  return { label: 'Weak', color: '#ff3b30', width: '33%', level: 1 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('🎓');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await registerUser(name, email, password, selectedAvatar);
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
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
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-16">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-[16px]">
              C
            </div>
            <span className="font-bold text-[19px] tracking-tight text-[var(--color-text)]">Cadence</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--color-text)] mb-2">
              Create your account
            </h1>
            <p className="text-[16px] text-[var(--color-text-secondary)]">
              Join thousands of students studying smarter
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full h-12 px-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.15)'; e.target.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                style={{ boxShadow: 'none' }}
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.15)'; e.target.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Password + strength */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-12 px-4 pr-12 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] text-[16px] transition-colors focus:outline-none"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.15)'; e.target.style.borderColor = 'var(--color-accent)'; }}
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

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Avatar selector */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Choose Your Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    aria-label={`Select avatar ${emoji}`}
                    aria-pressed={selectedAvatar === emoji}
                    className="h-12 rounded-[var(--radius-md)] flex items-center justify-center text-[22px] transition-all active:scale-90"
                    style={{
                      background: selectedAvatar === emoji ? 'rgba(10,132,255,0.12)' : 'var(--color-surface)',
                      border: selectedAvatar === emoji
                        ? '2px solid var(--color-accent)'
                        : '2px solid transparent',
                      boxShadow: selectedAvatar === emoji ? '0 0 0 2px rgba(10,132,255,0.2)' : 'none',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
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

            {/* Create Account button */}
            <button
              type="submit"
              disabled={isLoading || isGuestLoading}
              className="w-full h-12 mt-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white font-semibold text-[16px] flex items-center justify-center gap-2 hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span>Creating account…</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Guest button */}
          <button
            type="button"
            onClick={handleGuest}
            disabled={isLoading || isGuestLoading}
            className="w-full h-12 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-[16px] flex items-center justify-center gap-2.5 hover:bg-[var(--color-surface-overlay)] hover:border-[var(--color-border-strong)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-accent)] font-semibold hover:underline">
              Sign In
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
      <circle cx="8" cy="8" r="6" stroke="white" strokeOpacity="0.3" strokeWidth="2"/>
      <path d="M14 8a6 6 0 0 0-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
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