'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';

export function OnboardingCheck() {
  const router = useRouter();

  useEffect(() => {
    // Only check onboarding for registered authenticated students
    const user = getCurrentUser();
    if (user.isGuest) return;

    const completed = localStorage.getItem('cadence_onboarding_completed');
    if (!completed) {
      router.replace('/onboarding');
    }
  }, [router]);

  return null;
}
