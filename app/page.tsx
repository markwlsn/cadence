import { getDashboardData } from '@/lib/server-dashboard';
import { OnboardingCheck, Navbar } from '@/components/ui';
import HomeContainer from './_components/HomeContainer';

export const revalidate = 0; // Always fresh on every navigation

export default async function HomePage() {
  const { decks, statsEntries } = await getDashboardData();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <OnboardingCheck />
      <Navbar />
      <HomeContainer decks={decks} statsEntries={statsEntries} />
    </div>
  );
}
