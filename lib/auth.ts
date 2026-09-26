'use client';

/**
 * Authentication & Student Profile Service
 * Communicates with secure server-side auth API routes.
 * Zero plaintext passwords in browser storage.
 */

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  avatar: string;
  isGuest: boolean;
  createdAt: string;
}

const USER_STORAGE_KEY = 'cadence_current_user';

export const AVATAR_OPTIONS = ['🎓', '🔬', '📚', '🚀', '💻', '💡', '🎨', '⚡', '🧬', '🏆'];

function generateGuestId(): string {
  return 'guest_' + Math.random().toString(36).substring(2, 9);
}

// Clean up legacy plaintext database key if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('cadence_registered_users');
  } catch {}
}

export function getCurrentUser(): User {
  if (typeof window === 'undefined') {
    return {
      id: 'guest_default',
      name: 'Guest Scholar',
      avatar: '🎓',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      const guestUser: User = {
        id: generateGuestId(),
        name: 'Guest Scholar',
        avatar: '🎓',
        isGuest: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
      return guestUser;
    }
    return JSON.parse(raw) as User;
  } catch {
    return {
      id: 'guest_fallback',
      name: 'Guest Scholar',
      avatar: '🎓',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
  }
}

export function saveCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('cadence_auth_updated', { detail: user }));
}

/**
 * Log in via secure server-side API with scrypt hashing verification.
 */
export async function loginUser(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!email || !pass) {
    return { success: false, error: 'Please provide both email and password.' };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Authentication error occurred.' };
    }

    if (data.user) {
      saveCurrentUser(data.user);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Unexpected login response.' };
  } catch {
    return { success: false, error: 'Network error during login. Please try again.' };
  }
}

/**
 * Register a new student account via secure server-side API.
 */
export async function registerUser(
  name: string,
  email: string,
  pass: string,
  avatar?: string,
  phone?: string,
  age?: number
): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!name.trim()) return { success: false, error: 'Please enter your name.' };
  if (!email.trim() || !email.includes('@')) return { success: false, error: 'Please enter a valid email address.' };
  if (pass.length < 6) return { success: false, error: 'Password must be at least 6 characters long.' };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: pass,
        avatar: avatar || '🎓',
        phone: phone?.trim(),
        age: age ? Number(age) : undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Registration failed.' };
    }

    if (data.user) {
      saveCurrentUser(data.user);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Failed to create account.' };
  } catch {
    return { success: false, error: 'Network error during registration.' };
  }
}

/**
 * Fast frictionless "Continue as Guest"
 */
export function continueAsGuest(customName?: string): User {
  const guest: User = {
    id: generateGuestId(),
    name: customName?.trim() || 'Guest Scholar',
    avatar: '🎓',
    isGuest: true,
    createdAt: new Date().toISOString(),
  };
  saveCurrentUser(guest);
  return guest;
}

/**
 * Upgrade current guest account to permanent registered account
 */
export async function convertGuestToPermanent(
  name: string,
  email: string,
  pass: string,
  avatar?: string,
  phone?: string,
  age?: number
): Promise<{ success: boolean; error?: string; user?: User }> {
  return await registerUser(name, email, pass, avatar, phone, age);
}

/**
 * Update user details (name, avatar, phone, age)
 */
export function updateUserProfile(updates: Partial<User>): User {
  const current = getCurrentUser();
  const updated: User = {
    ...current,
    ...updates,
  };
  saveCurrentUser(updated);
  return updated;
}

/**
 * Sign out and clear server-side session cookie
 */
export function logoutUser(): User {
  if (typeof window !== 'undefined') {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }

  const newGuest: User = {
    id: generateGuestId(),
    name: 'Guest Scholar',
    avatar: '🎓',
    isGuest: true,
    createdAt: new Date().toISOString(),
  };
  saveCurrentUser(newGuest);
  return newGuest;
}

/**
 * Permanently delete the current user account and purge study data
 * Compliance: Apple App Store Review Guideline 5.1.1(v), FERPA & GDPR
 */
export async function deleteAccountAndData(): Promise<User> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/user/delete', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('cadence_user_stats');
      localStorage.removeItem('cadence_custom_decks');
      localStorage.removeItem('cadence_custom_cards');
      window.dispatchEvent(new CustomEvent('cadence_stats_updated', { detail: null }));
    } catch (e) {
      console.error('Error during account deletion:', e);
    }
  }
  return logoutUser();
}
