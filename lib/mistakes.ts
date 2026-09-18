import type { Card } from '@/types';

export type ErrorTaxonomy = 'misread' | 'concept' | 'gap' | 'calculation' | 'unclassified';

export interface MistakeEntry {
  id: string;
  cardId: string;
  deckId: string;
  deckTitle: string;
  front: string;
  back: string;
  cardType: string;
  explanation?: string;
  options?: string[];
  taxonomy: ErrorTaxonomy;
  notes?: string;
  recordedAt: string;
  reviewedCount: number;
  lastReviewedAt?: string;
  resolved: boolean;
}

export const TAXONOMY_CONFIG: Record<
  ErrorTaxonomy,
  { label: string; icon: string; description: string }
> = {
  misread: {
    label: 'Misread Question',
    icon: '⚡',
    description: 'Rushed through prompt, missed a negative (NOT/EXCEPT), or misread conditions.',
  },
  concept: {
    label: 'Concept Distinction',
    icon: '🧠',
    description: 'Confused two related mechanisms, stages, or fell for a distractor trap.',
  },
  gap: {
    label: 'Knowledge Gap',
    icon: '📖',
    description: 'Unfamiliar terminology or missing foundational definition.',
  },
  calculation: {
    label: 'Multi-Step / Execution',
    icon: '🔢',
    description: 'Calculation, formula, or procedural sequence error.',
  },
  unclassified: {
    label: 'General Review',
    icon: '🚩',
    description: 'Missed question awaiting cognitive classification.',
  },
};

const STORAGE_KEY = 'cadence_mistake_notebook';

export function getMistakes(): MistakeEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MistakeEntry[];
  } catch (err) {
    console.error('Error reading mistake notebook:', err);
    return [];
  }
}

export function saveMistakes(mistakes: MistakeEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
    window.dispatchEvent(new CustomEvent('cadence_mistakes_updated'));
  } catch (err) {
    console.error('Error saving mistake notebook:', err);
  }
}

export function recordMistake(
  card: Card,
  deckId: string,
  deckTitle: string,
  taxonomy: ErrorTaxonomy = 'unclassified'
): void {
  const current = getMistakes();
  const existingIdx = current.findIndex((m) => m.cardId === card.id);

  if (existingIdx >= 0) {
    current[existingIdx].reviewedCount += 1;
    current[existingIdx].lastReviewedAt = new Date().toISOString();
    current[existingIdx].resolved = false;
  } else {
    current.unshift({
      id: `mistake-${card.id}-${Date.now()}`,
      cardId: card.id,
      deckId,
      deckTitle,
      front: card.front,
      back: card.back,
      cardType: card.type,
      explanation: card.explanation,
      options: card.options,
      taxonomy,
      recordedAt: new Date().toISOString(),
      reviewedCount: 1,
      resolved: false,
    });
  }

  saveMistakes(current);
}

export function updateMistakeTaxonomy(
  cardId: string,
  taxonomy: ErrorTaxonomy,
  notes?: string
): void {
  const current = getMistakes();
  const entry = current.find((m) => m.cardId === cardId);
  if (entry) {
    entry.taxonomy = taxonomy;
    if (notes !== undefined) entry.notes = notes;
    saveMistakes(current);
  }
}

export function toggleResolveMistake(cardId: string): void {
  const current = getMistakes();
  const entry = current.find((m) => m.cardId === cardId);
  if (entry) {
    entry.resolved = !entry.resolved;
    saveMistakes(current);
  }
}

export function clearResolvedMistakes(): void {
  const current = getMistakes();
  const unresolved = current.filter((m) => !m.resolved);
  saveMistakes(unresolved);
}
