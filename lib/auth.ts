'use client';

/**
 * Authentication & Student Profile Service
 * Supports frictionless Guest mode, Registered accounts, and Profile personalization.
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
const USERS_DB_KEY = 'cadence_registered_users';

export const AVATAR_OPTIONS = ['🎓', '🔬', '📚', '🚀', '💻', '💡', '🎨', '⚡', '🧬', '🏆'];

function generateGuestId(): string {
  return 'guest_' + Math.random().toString(36).substring(2, 9);
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
      // Default initial guest user
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
 * Log in with email and password
 */
export async function loginUser(email: string, pass: string): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!email || !pass) {
    return { success: false, error: 'Please provide both email and password.' };
  }

  try {
    const rawUsers = localStorage.getItem(USERS_DB_KEY);
    const users: Record<string, User & { passwordHash: string }> = rawUsers ? JSON.parse(rawUsers) : {};

    const cleanEmail = email.toLowerCase().trim();
    const existing = users[cleanEmail];

    if (!existing) {
      return { success: false, error: 'No account found with this email. Please register first.' };
    }

    if (existing.passwordHash !== pass) {
      return { success: false, error: 'Incorrect password. Please check your credentials.' };
    }

    const { passwordHash, ...safeUser } = existing;
    saveCurrentUser(safeUser);

    return { success: true, user: safeUser };
  } catch (err) {
    return { success: false, error: 'Authentication error occurred.' };
  }
}

/**
 * Register a new student account
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
  if (age !== undefined && !isNaN(age) && (age < 5 || age > 120)) {
    return { success: false, error: 'Please enter a realistic age between 5 and 120.' };
  }

  try {
    const rawUsers = localStorage.getItem(USERS_DB_KEY);
    const users: Record<string, User & { passwordHash: string }> = rawUsers ? JSON.parse(rawUsers) : {};

    const cleanEmail = email.toLowerCase().trim();
    if (users[cleanEmail]) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || undefined,
      age: age !== undefined && !isNaN(age) && age > 0 ? Number(age) : undefined,
      avatar: avatar || '🎓',
      isGuest: false,
      createdAt: new Date().toISOString(),
    };

    users[cleanEmail] = {
      ...newUser,
      passwordHash: pass,
    };

    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    saveCurrentUser(newUser);

    return { success: true, user: newUser };
  } catch (err) {
    return { success: false, error: 'Failed to create account.' };
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
  const res = await registerUser(name, email, pass, avatar, phone, age);
  return res;
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

  if (typeof window !== 'undefined' && !updated.isGuest && updated.email) {
    try {
      const rawUsers = localStorage.getItem(USERS_DB_KEY);
      if (rawUsers) {
        const users: Record<string, User & { passwordHash: string }> = JSON.parse(rawUsers);
        const cleanEmail = updated.email.toLowerCase().trim();
        if (users[cleanEmail]) {
          users[cleanEmail] = {
            ...users[cleanEmail],
            ...updated,
          };
          localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
        }
      }
    } catch (e) {
      console.error('Failed to sync profile updates to local database:', e);
    }
  }

  return updated;
}

/**
 * Sign out and reset to fresh guest session
 */
export function logoutUser(): User {
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
 * Compliance: Apple App Store Review Guideline 5.1.1(v) & GDPR
 */
export function deleteAccountAndData(): User {
  if (typeof window !== 'undefined') {
    try {
      const current = getCurrentUser();
      if (!current.isGuest && current.email) {
        const rawDb = localStorage.getItem(USERS_DB_KEY);
        if (rawDb) {
          const users: Record<string, unknown> = JSON.parse(rawDb);
          const cleanEmail = current.email.toLowerCase().trim();
          delete users[cleanEmail];
          localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
        }
      }
      localStorage.removeItem('cadence_user_stats');
      window.dispatchEvent(new CustomEvent('cadence_stats_updated', { detail: null }));
    } catch (e) {
      console.error('Error during account deletion:', e);
    }
  }
  return logoutUser();
}

