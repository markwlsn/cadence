import type { Card } from '@/types';

// Reference time: 2026-09-17T00:00:00Z (current date during development)
// Dates spread across: overdue (past), due today, due in future

export const mockCards: Card[] = [
  // ─── Molecular Biology (deck-001) ───────────────────────────────────────────

  // Overdue — basic
  {
    id: 'card-001',
    deckId: 'deck-001',
    type: 'basic',
    front: 'What is the central dogma of molecular biology?',
    back: 'DNA → RNA → Protein',
    explanation:
      'The central dogma describes the flow of genetic information: DNA is transcribed into RNA, which is then translated into protein. Reverse transcriptase (in retroviruses) is the main exception.',
    due: '2026-09-10T00:00:00Z', // overdue (7 days ago)
    stability: 0.5,
    difficulty: 0.4,
    lastReviewed: '2026-09-03T10:00:00Z',
    reps: 2,
  },
  // Overdue — cloze
  {
    id: 'card-002',
    deckId: 'deck-001',
    type: 'cloze',
    front: '{{c1::Adenine}} pairs with {{c1::Thymine}} in DNA via {{c1::two}} hydrogen bonds.',
    back: 'Adenine pairs with Thymine in DNA via two hydrogen bonds.',
    explanation: 'A–T pairing uses 2 hydrogen bonds; G–C pairing uses 3. This is why GC-rich regions are more thermally stable.',
    due: '2026-09-12T00:00:00Z', // overdue (5 days ago)
    stability: 1.2,
    difficulty: 0.3,
    lastReviewed: '2026-09-07T08:00:00Z',
    reps: 3,
  },
  // Due today — basic
  {
    id: 'card-003',
    deckId: 'deck-001',
    type: 'basic',
    front: 'What enzyme unwinds the DNA double helix during replication?',
    back: 'Helicase',
    explanation: 'Helicase breaks hydrogen bonds between base pairs to separate the two strands. It requires ATP and moves 5\'→3\' along each strand.',
    due: '2026-09-17T00:00:00Z', // due today
    stability: 2.1,
    difficulty: 0.35,
    lastReviewed: '2026-09-10T14:00:00Z',
    reps: 4,
  },
  // Due today — mcq
  {
    id: 'card-004',
    deckId: 'deck-001',
    type: 'mcq',
    front: 'Which of the following is NOT a function of the smooth endoplasmic reticulum?',
    back: 'Protein synthesis',
    explanation: 'The rough ER (studded with ribosomes) handles protein synthesis. The smooth ER is involved in lipid synthesis, drug detoxification, and calcium storage.',
    options: ['Lipid synthesis', 'Drug detoxification', 'Protein synthesis', 'Calcium storage'],
    due: '2026-09-17T06:00:00Z', // due today
    stability: 1.8,
    difficulty: 0.45,
    lastReviewed: '2026-09-13T09:00:00Z',
    reps: 3,
  },
  // Due in 2 days — basic
  {
    id: 'card-005',
    deckId: 'deck-001',
    type: 'basic',
    front: 'What is the role of tRNA in protein synthesis?',
    back: 'tRNA carries amino acids to the ribosome and matches codons on mRNA via its anticodon.',
    explanation: 'Each tRNA is charged by an aminoacyl-tRNA synthetase enzyme, which ensures the correct amino acid is attached. The anticodon is complementary to the mRNA codon.',
    due: '2026-09-19T00:00:00Z',
    stability: 4.5,
    difficulty: 0.28,
    lastReviewed: '2026-09-14T11:00:00Z',
    reps: 6,
  },
  // Due in 5 days — cloze
  {
    id: 'card-006',
    deckId: 'deck-001',
    type: 'cloze',
    front: 'The {{c1::mitochondria}} is often called the powerhouse of the cell because it produces {{c1::ATP}} via {{c1::oxidative phosphorylation}}.',
    back: 'The mitochondria is often called the powerhouse of the cell because it produces ATP via oxidative phosphorylation.',
    due: '2026-09-22T00:00:00Z',
    stability: 6.0,
    difficulty: 0.25,
    lastReviewed: '2026-09-16T16:00:00Z',
    reps: 7,
  },
  // Overdue — mcq
  {
    id: 'card-007',
    deckId: 'deck-001',
    type: 'mcq',
    front: 'During which phase of mitosis do chromosomes align along the cell\'s equatorial plate?',
    back: 'Metaphase',
    explanation: 'In metaphase, chromosomes align at the metaphase plate (cell equator) with kinetochores attached to spindle fibers from both poles.',
    options: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
    due: '2026-09-14T00:00:00Z', // overdue (3 days ago)
    stability: 0.8,
    difficulty: 0.5,
    lastReviewed: '2026-09-06T13:00:00Z',
    reps: 2,
  },
  // Due in 10 days — basic
  {
    id: 'card-008',
    deckId: 'deck-001',
    type: 'basic',
    front: 'What is apoptosis?',
    back: 'Programmed cell death — a controlled process where a cell destroys itself without triggering an immune response.',
    explanation: 'Apoptosis removes damaged or unwanted cells. It\'s characterised by cell shrinkage, chromatin condensation, and the formation of apoptotic bodies that are phagocytosed.',
    due: '2026-09-27T00:00:00Z',
    stability: 9.2,
    difficulty: 0.22,
    lastReviewed: '2026-09-17T00:00:00Z',
    reps: 9,
  },
  // Due in 1 day — cloze
  {
    id: 'card-009',
    deckId: 'deck-001',
    type: 'cloze',
    front: 'The {{c1::CRISPR-Cas9}} system uses guide RNA to direct the {{c1::Cas9}} nuclease to cut specific {{c1::DNA}} sequences.',
    back: 'The CRISPR-Cas9 system uses guide RNA to direct the Cas9 nuclease to cut specific DNA sequences.',
    explanation: 'CRISPR-Cas9 was adapted from a natural bacterial immune system. The guide RNA (gRNA) matches the target sequence, and Cas9 creates a double-strand break, enabling gene editing.',
    due: '2026-09-18T00:00:00Z',
    stability: 3.1,
    difficulty: 0.32,
    lastReviewed: '2026-09-15T10:00:00Z',
    reps: 5,
  },

  // ─── World History (deck-002) ────────────────────────────────────────────────

  // Overdue — basic
  {
    id: 'card-010',
    deckId: 'deck-002',
    type: 'basic',
    front: 'What event triggered the start of World War I?',
    back: 'The assassination of Archduke Franz Ferdinand of Austria-Hungary in Sarajevo on June 28, 1914.',
    explanation: 'The assassination was carried out by Gavrilo Princip of the Black Hand. It triggered a cascade of alliance obligations that drew Europe\'s major powers into conflict within weeks.',
    due: '2026-09-08T00:00:00Z', // overdue (9 days ago)
    stability: 0.4,
    difficulty: 0.4,
    lastReviewed: '2026-09-01T09:00:00Z',
    reps: 1,
  },
  // Overdue — mcq
  {
    id: 'card-011',
    deckId: 'deck-002',
    type: 'mcq',
    front: 'Which treaty ended World War I?',
    back: 'Treaty of Versailles (1919)',
    options: ['Treaty of Paris', 'Treaty of Versailles', 'Treaty of Brest-Litovsk', 'Treaty of Westphalia'],
    due: '2026-09-11T00:00:00Z', // overdue (6 days ago)
    stability: 0.9,
    difficulty: 0.35,
    lastReviewed: '2026-09-05T11:00:00Z',
    reps: 2,
  },
  // Due today — cloze
  {
    id: 'card-012',
    deckId: 'deck-002',
    type: 'cloze',
    front: 'The {{c1::Russian Revolution}} of {{c1::1917}} brought the {{c1::Bolsheviks}} to power under {{c1::Lenin}}.',
    back: 'The Russian Revolution of 1917 brought the Bolsheviks to power under Lenin.',
    explanation: 'The revolution occurred in two waves: the February Revolution (ousting the Tsar) and the October Revolution (the Bolshevik seizure of power). It led to the founding of the Soviet Union in 1922.',
    due: '2026-09-17T02:00:00Z', // due today
    stability: 2.3,
    difficulty: 0.38,
    lastReviewed: '2026-09-11T15:00:00Z',
    reps: 4,
  },
  // Due today — basic
  {
    id: 'card-013',
    deckId: 'deck-002',
    type: 'basic',
    front: 'What was the Great Depression?',
    back: 'A severe global economic downturn that began in 1929 with the Wall Street Crash and lasted through most of the 1930s.',
    explanation: 'Triggered by the stock market crash of October 1929, it caused 25%+ unemployment in the US, global bank collapses, and sharp deflation. It contributed to the conditions that enabled fascism\'s rise in Europe.',
    due: '2026-09-17T08:00:00Z', // due today
    stability: 1.6,
    difficulty: 0.42,
    lastReviewed: '2026-09-13T12:00:00Z',
    reps: 3,
  },
  // Due in 3 days — mcq
  {
    id: 'card-014',
    deckId: 'deck-002',
    type: 'mcq',
    front: 'Which country was NOT part of the Allied Powers in World War II?',
    back: 'Italy (until 1943)',
    options: ['United States', 'Soviet Union', 'Italy', 'United Kingdom'],
    due: '2026-09-20T00:00:00Z',
    stability: 5.5,
    difficulty: 0.48,
    lastReviewed: '2026-09-15T09:00:00Z',
    reps: 5,
  },
  // Due in 7 days — basic
  {
    id: 'card-015',
    deckId: 'deck-002',
    type: 'basic',
    front: 'What was the Manhattan Project?',
    back: 'The secret US-led research and development effort to create the first nuclear weapons during World War II.',
    explanation: 'Led by J. Robert Oppenheimer, it produced the first atomic bombs. Two were dropped on Hiroshima and Nagasaki in August 1945, leading to Japan\'s surrender and the end of WWII.',
    due: '2026-09-24T00:00:00Z',
    stability: 7.8,
    difficulty: 0.2,
    lastReviewed: '2026-09-16T17:00:00Z',
    reps: 8,
  },
  // Overdue — basic
  {
    id: 'card-016',
    deckId: 'deck-002',
    type: 'basic',
    front: 'What was the significance of the Battle of Stalingrad (1942–1943)?',
    back: 'It was the turning point of WWII on the Eastern Front — the first major German defeat and the beginning of a Soviet counter-offensive that ultimately ended the war.',
    explanation: 'Over 2 million total casualties made it one of the deadliest battles in history. The encirclement of the German 6th Army showed that the Wehrmacht was not invincible.',
    due: '2026-09-15T00:00:00Z', // overdue (2 days ago)
    stability: 1.1,
    difficulty: 0.44,
    lastReviewed: '2026-09-08T10:00:00Z',
    reps: 3,
  },
  // Due in 14 days — cloze (well-learned)
  {
    id: 'card-017',
    deckId: 'deck-002',
    type: 'cloze',
    front: 'The {{c1::Holocaust}} was the systematic, state-sponsored genocide of {{c1::six million Jews}} by the {{c1::Nazi}} regime between 1941 and 1945.',
    back: 'The Holocaust was the systematic, state-sponsored genocide of six million Jews by the Nazi regime between 1941 and 1945.',
    due: '2026-10-01T00:00:00Z',
    stability: 12.0,
    difficulty: 0.18,
    lastReviewed: '2026-09-17T00:00:00Z',
    reps: 11,
  },
];
