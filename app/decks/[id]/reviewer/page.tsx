import { notFound } from 'next/navigation';
import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Navbar, BackButton } from '@/components/ui';
import ReviewerPdfClient from './_components/ReviewerPdfClient';

interface ReviewerPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function DeckReviewerPage({ params }: ReviewerPageProps) {
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
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 md:py-10 print:p-0 print:max-w-none">
        <ReviewerPdfClient
          deckId={id}
          deck={deck}
          stats={stats}
          cards={cards}
        />
      </main>
    </div>
  );
}
