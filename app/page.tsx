import Link from 'next/link';
import { getDecks, getDeckStats } from '@/lib/data';
import { Badge, ProgressRing, Button, OnboardingCheck } from '@/components/ui';

export const revalidate = 0; // Fresh on every navigation

export default async function HomePage() {
  const decks = await getDecks();
  const deckStats = await Promise.all(decks.map((deck) => getDeckStats(deck.id)));
  const statsMap = new Map(deckStats.map((s) => [s.deckId, s]));

  const totalDue = deckStats.reduce((sum, s) => sum + s.dueNow, 0);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <OnboardingCheck />
      {/* Top App Bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-[16px] shadow-sm">
              C
            </div>
            <div>
              <span className="font-bold text-[19px] tracking-tight text-[var(--color-text)]">
                Cadence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-2 py-1 transition-colors inline-block"
            >
              How it works
            </Link>
            <Link href="/decks/new">
              <Button variant="primary" size="sm">
                + New Deck
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Header Summary Section */}
        <section className="mb-10 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[var(--color-text)]">
              Your Decks
            </h1>
            <p className="text-[15px] text-[var(--color-text-secondary)] mt-1">
              {totalDue > 0
                ? `${totalDue} card${totalDue === 1 ? '' : 's'} due for review today.`
                : 'All caught up on scheduled reviews!'}
            </p>
          </div>

          {totalDue > 0 && (
            <Badge variant="warning" size="md" className="self-start sm:self-auto font-semibold">
              {totalDue} Due Now
            </Badge>
          )}
        </section>

        {/* Deck Grid or Empty State */}
        {decks.length === 0 ? (
          <div className="text-center py-20 px-6 border-2 border-dashed border-[var(--color-border-strong)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
            <h3 className="text-[20px] font-semibold text-[var(--color-text)] mb-2">
              No decks yet
            </h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mx-auto mb-6">
              Create your first deck by uploading lecture notes, a PDF, or a photo.
            </p>
            <Link href="/decks/new">
              <Button variant="primary" size="md">
                Create First Deck
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decks.map((deck) => {
              const stats = statsMap.get(deck.id) || {
                totalCards: 0,
                dueNow: 0,
                masteredCount: 0,
                accuracyLast7Days: 0,
              };

              const masteryPercent =
                stats.totalCards > 0
                  ? Math.round((stats.masteredCount / stats.totalCards) * 100)
                  : 0;

              return (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="group block focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] rounded-[var(--radius-lg)]"
                >
                  <article className="h-full p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          {deck.sourceType === 'pdf'
                            ? 'PDF Document'
                            : deck.sourceType === 'image'
                            ? 'Notes Photo'
                            : 'Text Import'}
                        </span>
                        {stats.dueNow > 0 ? (
                          <Badge variant="accent" size="sm">
                            {stats.dueNow} due
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            0 due
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-[22px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors leading-snug mb-2">
                        {deck.title}
                      </h2>
                      <p className="text-[14px] text-[var(--color-text-secondary)]">
                        {stats.totalCards} total cards · {stats.masteredCount} mastered
                      </p>
                    </div>

                    {/* Card Footer: Mastery Progress and Quick Action */}
                    <div className="mt-8 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProgressRing
                          percent={masteryPercent}
                          size={46}
                          strokeWidth={3.5}
                          color={masteryPercent > 50 ? 'var(--color-success)' : 'var(--color-accent)'}
                        />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-[var(--color-text)]">
                            Mastery
                          </span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]">
                            {stats.accuracyLast7Days > 0
                              ? `${Math.round(stats.accuracyLast7Days * 100)}% 7d accuracy`
                              : 'Ready to review'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[13px] font-medium text-[var(--color-accent)] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        View Deck →
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
