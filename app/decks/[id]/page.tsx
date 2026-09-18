import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Navbar, BackButton } from '@/components/ui';
import DeckDetailClient from './_components/DeckDetailClient';

interface DeckDashboardProps {
  params: Promise<{ id: string }>;
}

export default async function DeckDashboardPage({ params }: DeckDashboardProps) {
  const { id } = await params;
  const deck = await getDeck(id);

  if (!deck) {
    notFound();
  }

  const [stats, cards] = await Promise.all([getDeckStats(id), getDeckCards(id)]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 pb-28 md:py-12">
        {/* Breadcrumb & Back navigation */}
        <div className="flex items-center gap-2 mb-6">
          <BackButton href="/" label="Dashboard" />
          <span className="text-[var(--color-text-tertiary)] text-[13px]">/</span>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)] truncate max-w-[200px] sm:max-w-md">
            {deck.title}
          </span>
        </div>

        <DeckDetailClient deck={deck} stats={stats} cards={cards} />
      </main>
    </div>
  );
}
