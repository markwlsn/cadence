import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Badge, ProgressRing, Button, Navbar } from '@/components/ui';
import DeckManageActions from './_components/DeckManageActions';

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

  const masteryPercent =
    stats.totalCards > 0
      ? Math.round((stats.masteredCount / stats.totalCards) * 100)
      : 0;

  // Breakdown by card type (basic, cloze, mcq)
  const typeCounts = cards.reduce(
    (acc, card) => {
      acc[card.type] = (acc[card.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 sm:py-12">
        {/* Title and Action Banner */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="neutral" size="sm" className="uppercase">
                {deck.sourceType}
              </Badge>
              {stats.dueNow > 0 ? (
                <Badge variant="accent" size="sm">
                  {stats.dueNow} Due
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  Up to date
                </Badge>
              )}
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--color-text)]">
              {deck.title}
            </h1>
            <p className="text-[15px] text-[var(--color-text-secondary)] mt-1">
              Created on {new Date(deck.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DeckManageActions
              deckId={deck.id}
              deckTitle={deck.title}
              isArchived={Boolean(deck.isArchived)}
            />
            <div className="flex items-center gap-2">
              <Link href={`/decks/${deck.id}/review?mode=cram`}>
                <Button variant="secondary" size="md">
                  Cram All ({stats.totalCards})
                </Button>
              </Link>
              <Link href={`/decks/${deck.id}/review?mode=mastery`}>
                <Button variant="primary" size="md">
                  Start Review ({stats.dueNow > 0 ? stats.dueNow : stats.totalCards})
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Grid — Minimal & Apple style */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8">
          <div className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
              Due Now
            </span>
            <span className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">
              {stats.dueNow}
            </span>
          </div>

          <div className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
              Total Cards
            </span>
            <span className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">
              {stats.totalCards}
            </span>
          </div>

          <div className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
              Mastered
            </span>
            <span className="text-[28px] font-bold text-[var(--color-success)] tracking-tight">
              {stats.masteredCount}
            </span>
          </div>

          <div className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
              7-Day Accuracy
            </span>
            <span className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">
              {Math.round(stats.accuracyLast7Days * 100)}%
            </span>
          </div>
        </section>

        {/* Mastery Overview & Card Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Overall Mastery Ring Card */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col items-center justify-center text-center">
            <ProgressRing
              percent={masteryPercent}
              size={96}
              strokeWidth={8}
              color="var(--color-accent-2)"
              className="mb-4"
            />
            <h3 className="text-[18px] font-semibold text-[var(--color-text)]">
              Overall Mastery
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 max-w-[200px]">
              {stats.masteredCount} of {stats.totalCards} cards have reached long-term stability.
            </p>
          </div>

          {/* Cards Breakdown by Type */}
          <div className="md:col-span-2 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
            <div>
              <h3 className="text-[17px] font-semibold text-[var(--color-text)] mb-1">
                Card Type Distribution
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
                Generated based on semantic structure in your material.
              </p>

              <div className="space-y-4">
                {[
                  { key: 'basic', label: 'Basic Q&A', desc: 'Direct concept recall' },
                  { key: 'cloze', label: 'Cloze Deletion', desc: 'Context-fill definitions' },
                  { key: 'mcq', label: 'Multiple Choice', desc: 'Discriminative comparison' },
                ].map(({ key, label, desc }) => {
                  const count = typeCounts[key] || 0;
                  const ratio = stats.totalCards > 0 ? (count / stats.totalCards) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[14px] mb-1.5">
                        <span className="font-medium text-[var(--color-text)]">
                          {label}{' '}
                          <span className="text-[12px] text-[var(--color-text-secondary)] font-normal ml-1">
                            ({desc})
                          </span>
                        </span>
                        <span className="font-semibold text-[var(--color-text)]">
                          {count} card{count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                FSRS algorithm optimizes recall intervals after each session.
              </span>
              <Link href={`/decks/${deck.id}/review`}>
                <Button variant="ghost" size="sm">
                  Start Session →
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
