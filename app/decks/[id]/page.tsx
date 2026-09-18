import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeck, getDeckStats, getDeckCards } from '@/lib/data';
import { Badge, ProgressRing, Button, Navbar, BackButton } from '@/components/ui';
import DeckManageActions from './_components/DeckManageActions';
import DeckAssessmentsList from './_components/DeckAssessmentsList';

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
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 pb-28 md:py-12">
        {/* Breadcrumb & Back navigation */}
        <div className="flex items-center gap-2 mb-6">
          <BackButton href="/" label="Dashboard" />
          <span className="text-[var(--color-text-tertiary)] text-[13px]">/</span>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)] truncate max-w-[200px] sm:max-w-md">
            {deck.title}
          </span>
        </div>

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

        {/* Structured Linear Curriculum Roadmap */}
        <section className="pt-6 space-y-8">
          {/* Linear Assessments List */}
          <DeckAssessmentsList deckId={deck.id} totalCards={stats.totalCards} />

          {/* Retention & Spaced Repetition Mastery Card */}
          <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <ProgressRing
                percent={masteryPercent}
                size={72}
                strokeWidth={6}
                color="var(--color-text)"
              />
              <div className="space-y-1">
                <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                  Long-Term Memory Stability: {masteryPercent}%
                </h3>
                <p className="text-[13px] text-[var(--color-text-secondary)] max-w-md leading-relaxed">
                  {stats.masteredCount} of {stats.totalCards} questions have achieved high stability through FSRS spaced retrieval practice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/decks/${deck.id}/review?mode=mastery`}>
                <Button variant="secondary" size="sm">
                  Quick Practice ({stats.dueNow > 0 ? stats.dueNow : stats.totalCards})
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
