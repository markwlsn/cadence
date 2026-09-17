'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingCheck() {
  const router = useRouter();

  useEffect(() => {
    // If user has not completed or skipped onboarding, redirect to onboarding flow
    const completed = localStorage.getItem('cadence_onboarding_completed');
    if (!completed) {
      router.replace('/onboarding');
    }
  }, [router]);

  return null;
}
