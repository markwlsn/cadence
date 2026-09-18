import { Navbar, BackButton } from '@/components/ui';
import NotebookClient from './_components/NotebookClient';

export const revalidate = 0;

export default function NotebookPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 md:py-10">
        <div className="flex items-center gap-2 mb-6">
          <BackButton href="/" label="Dashboard" />
          <span className="text-[var(--color-text-tertiary)] text-[13px]">/</span>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            Mistake Notebook
          </span>
        </div>

        <NotebookClient />
      </main>
    </div>
  );
}
