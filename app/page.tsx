import { getDecks, getDeckStats } from '@/lib/data';
import { OnboardingCheck, Navbar } from '@/components/ui';
import HomeContainer from './_components/HomeContainer';

export const revalidate = 0; // Always fresh on every navigation

export default async function HomePage() {
  const decks = await getDecks();
  const deckStats = await Promise.all(decks.map((d) => getDeckStats(d.id)));
  const statsEntries = deckStats.map((s) => [s.deckId, s] as [string, typeof s]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <OnboardingCheck />
      <Navbar />
      <HomeContainer decks={decks} statsEntries={statsEntries} />
    </div>
  );
}
