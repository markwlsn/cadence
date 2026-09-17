import assert from 'node:assert';
import { scheduleCard, MASTERY_STABILITY_DAYS } from '../fsrs';
import type { Card } from '../../types';

function createTestCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card-1',
    deckId: 'test-deck-1',
    type: 'basic',
    front: 'Question',
    back: 'Answer',
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 5.0,
    reps: 0,
    ...overrides,
  };
}

async function runTests() {
  console.log('Running FSRS tests...\n');

  // Test 1: 'good' rating on new card moves due date forward
  {
    const card = createTestCard();
    const result = scheduleCard(card, 'good');
    const now = new Date();
    const dueDate = new Date(result.due);

    assert(dueDate > now, 'Due date should be in future for "good"');
    assert(result.reps === 1, 'Reps should increment to 1');
    assert(result.stability > 0, 'Stability should increase');
    console.log('✓ Test 1 passed: "good" advances due date');
  }

  // Test 2: 'again' rating sets due within 24 hours
  {
    const card = createTestCard({ reps: 2, stability: 5.0 });
    const result = scheduleCard(card, 'again');
    const now = new Date();
    const dueDate = new Date(result.due);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    assert(diffHours <= 24, `Due date should be <= 24 hours for "again", got ${diffHours}h`);
    console.log('✓ Test 2 passed: "again" pulls due date close (<24h)');
  }

  // Test 3: 'easy' interval is greater than 'good' interval
  {
    const card = createTestCard();
    const goodResult = scheduleCard(card, 'good');
    const easyResult = scheduleCard(card, 'easy');

    const goodDue = new Date(goodResult.due).getTime();
    const easyDue = new Date(easyResult.due).getTime();

    assert(easyDue > goodDue, 'Easy rating should give longer interval than good rating');
    console.log('✓ Test 3 passed: "easy" interval > "good" interval');
  }

  // Test 4: 'hard' interval is shorter than 'good'
  {
    const card = createTestCard({ reps: 1, stability: 2.0 });
    const hardResult = scheduleCard(card, 'hard');
    const goodResult = scheduleCard(card, 'good');

    const hardDue = new Date(hardResult.due).getTime();
    const goodDue = new Date(goodResult.due).getTime();

    assert(hardDue < goodDue, 'Hard rating interval should be shorter than good');
    console.log('✓ Test 4 passed: "hard" interval < "good" interval');
  }

  console.log('\nAll FSRS unit tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
