import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Navbar } from '@/components/ui';
import DeckPageResilient from './_components/DeckPageResilient';

interface DeckDashboardProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function DeckDashboardPage({ params }: DeckDashboardProps) {
  const { id } = await params;
  const deck = await getDeck(id).catch(() => null);

  const [stats, cards] = deck
    ? await Promise.all([
        getDeckStats(id).catch(() => null),
        getDeckCards(id).catch(() => []),
      ])
    : [null, []];

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 md:py-12">
        <DeckPageResilient
          deckId={id}
          initialDeck={deck}
          initialStats={stats}
          initialCards={cards}
        />
      </main>
    </div>
  );
}
