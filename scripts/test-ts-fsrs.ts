import { fsrs, Rating, State, type Card as FsrsCard } from 'ts-fsrs';

const f = fsrs({ enable_short_term: false });

const now = new Date();
const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

// Case 1: elapsed_days = 0, last_review = undefined
const card1: FsrsCard = {
  due: now,
  stability: 2.3,
  difficulty: 2.1,
  elapsed_days: 0,
  scheduled_days: 3,
  learning_steps: 0,
  reps: 1,
  lapses: 0,
  state: State.Review,
  last_review: past3Days,
};

const res1 = f.next(card1, now, Rating.Good);
console.log('Result with last_review 3 days ago, elapsed_days = 0:');
console.log('Stability:', res1.card.stability);
console.log('Scheduled days:', res1.card.scheduled_days);
console.log('Elapsed days computed:', res1.card.elapsed_days);

// Case 2: what if elapsed_days is 3?
const card2: FsrsCard = {
  ...card1,
  elapsed_days: 3,
};
const res2 = f.next(card2, now, Rating.Good);
console.log('\nResult with elapsed_days = 3:');
console.log('Stability:', res2.card.stability);
console.log('Scheduled days:', res2.card.scheduled_days);

// Case 3: what if reviewed 10 days later?
const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
const card3: FsrsCard = {
  ...card1,
  last_review: past10Days,
  elapsed_days: 10,
};
const res3 = f.next(card3, now, Rating.Good);
console.log('\nResult with elapsed_days = 10:');
console.log('Stability:', res3.card.stability);
console.log('Scheduled days:', res3.card.scheduled_days);
