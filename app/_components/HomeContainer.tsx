'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser, type User } from '@/lib/auth';
import type { Deck, DeckStats } from '@/types';
import DashboardClient from './DashboardClient';
import WelcomeLanding from './WelcomeLanding';

interface Props {
  decks: Deck[];
  statsEntries: [string, DeckStats][];
}

export default function HomeContainer({ decks, statsEntries }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());

    const handleAuth = (e: CustomEvent) => {
      setUser(e.detail as User);
    };

    window.addEventListener('cadence_auth_updated', handleAuth as EventListener);
    return () => {
      window.removeEventListener('cadence_auth_updated', handleAuth as EventListener);
    };
  }, []);

  // For authenticated students with a registered account, show their study dashboard
  if (mounted && user && !user.isGuest) {
    return <DashboardClient decks={decks} statsEntries={statsEntries} />;
  }

  // For visitors, guests, and during initial render, show the Apple-style Welcome Home Page
  return <WelcomeLanding />;
}
