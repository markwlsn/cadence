import { scheduleCard } from '../lib/fsrs';
import type { Card } from '../types';

function runFsrsLifecycle() {
  console.log('--- FSRS Card Review Lifecycle Simulation ---');

  let card: Card = {
    id: 'sim-card-1',
    deckId: 'sim-deck-1',
    type: 'basic',
    front: 'Question',
    back: 'Answer',
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 5.0,
    reps: 0,
  };

  console.log('Initial Card:', { reps: card.reps, stability: card.stability, difficulty: card.difficulty, due: card.due });

  // First review: Good
  card = scheduleCard(card, 'good');
  console.log('After 1st "good":', { reps: card.reps, stability: card.stability, difficulty: card.difficulty, due: card.due });

  // Second review: Good
  card = scheduleCard(card, 'good');
  console.log('After 2nd "good":', { reps: card.reps, stability: card.stability, difficulty: card.difficulty, due: card.due });

  // Third review: Easy
  const cardEasy = scheduleCard(card, 'easy');
  console.log('After 3rd "easy":', { reps: cardEasy.reps, stability: cardEasy.stability, difficulty: cardEasy.difficulty, due: cardEasy.due });

  // Third review alternate: Again
  const cardAgain = scheduleCard(card, 'again');
  console.log('After 3rd "again":', { reps: cardAgain.reps, stability: cardAgain.stability, difficulty: cardAgain.difficulty, due: cardAgain.due });

  // Compare intervals
  const now = new Date().getTime();
  const easyInterval = (new Date(cardEasy.due).getTime() - now) / (1000 * 60 * 60 * 24);
  const againInterval = (new Date(cardAgain.due).getTime() - now) / (1000 * 60 * 60 * 24);

  console.log(`Easy interval: ${easyInterval.toFixed(2)} days`);
  console.log(`Again interval: ${againInterval.toFixed(2)} days`);
}

runFsrsLifecycle();
