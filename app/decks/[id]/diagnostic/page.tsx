import { notFound } from 'next/navigation';
import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Navbar, BackButton } from '@/components/ui';
import DiagnosticReportClient from './_components/DiagnosticReportClient';

interface DiagnosticPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function DeckDiagnosticPage({ params }: DiagnosticPageProps) {
  const { id } = await params;
  const deck = await getDeck(id);

  if (!deck) {
    notFound();
  }

  const [stats, cards] = await Promise.all([getDeckStats(id), getDeckCards(id)]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 md:py-10 print:p-0 print:max-w-none">
        <div className="flex items-center gap-2 mb-6 print:hidden">
          <BackButton href={`/decks/${deck.id}`} label={deck.title} />
          <span className="text-[var(--color-text-tertiary)] text-[13px]">/</span>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            Diagnostic Readiness Report
          </span>
        </div>

        <DiagnosticReportClient deck={deck} stats={stats} cards={cards} />
      </main>
    </div>
  );
}
