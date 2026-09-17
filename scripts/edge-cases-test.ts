import { prisma } from '../lib/db';

const BASE_URL = 'http://localhost:3000';

async function runEdgeCases() {
  console.log('--- Adversarial & Edge Cases Test Suite ---\n');

  // Edge Case 1: Ingest unsupported file type (e.g. .exe or unknown binary)
  console.log('1. Ingesting unsupported file format...');
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) throw new Error('No deck found');

    const form = new globalThis.FormData();
    const blob = new Blob([Buffer.from('MZ\x90\x00\x03\x00\x00\x00')], { type: 'application/x-msdownload' });
    form.append('file', blob, 'malicious.exe');

    const res = await fetch(`${BASE_URL}/api/decks/${deck.id}/ingest`, {
      method: 'POST',
      body: form,
    });

    const data = await res.json();
    console.log('Unsupported file upload status:', res.status);
    console.log('Unsupported file upload response:', data);
  } catch (e: any) {
    console.error('File upload test error:', e.message);
  }

  // Edge Case 2: Ingest empty file (0 bytes)
  console.log('\n2. Ingesting empty file (0 bytes)...');
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) throw new Error('No deck found');

    const form = new globalThis.FormData();
    const blob = new Blob([Buffer.from('')], { type: 'text/plain' });
    form.append('file', blob, 'empty.txt');

    const res = await fetch(`${BASE_URL}/api/decks/${deck.id}/ingest`, {
      method: 'POST',
      body: form,
    });

    const data = await res.json();
    console.log('Empty file upload status:', res.status);
    console.log('Empty file upload response:', data);
  } catch (e: any) {
    console.error('Empty file upload error:', e.message);
  }

  // Edge Case 3: Review queue limit parameter behavior
  console.log('\n3. Review queue limit query param...');
  try {
    const res = await fetch(`${BASE_URL}/api/review/queue?deckId=deck-bio-101&mode=cram&limit=2`);
    const cards = await res.json();
    console.log(`Requested limit=2, received cards: ${cards.length}`);
  } catch (e: any) {
    console.error('Queue limit error:', e.message);
  }

  // Edge Case 4: Review submission concurrent requests on same card
  console.log('\n4. Rapid concurrent reviews on same card (race condition test)...');
  try {
    const card = await prisma.card.create({
      data: {
        deckId: 'deck-bio-101',
        front: 'Concurrency Test Card',
        back: 'Concurrency Answer',
        due: new Date(),
        stability: 1.0,
        difficulty: 5.0,
        reps: 0,
      },
    });

    // Send 3 rapid submit requests concurrently
    const promises = [
      fetch(`${BASE_URL}/api/review/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating: 'good' }),
      }),
      fetch(`${BASE_URL}/api/review/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating: 'good' }),
      }),
      fetch(`${BASE_URL}/api/review/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, rating: 'good' }),
      }),
    ];

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);
    console.log('Concurrent submit statuses:', statuses);

    const updatedCard = await prisma.card.findUnique({ where: { id: card.id } });
    const logs = await prisma.reviewLogEntry.findMany({ where: { cardId: card.id } });
    console.log(`Final reps: ${updatedCard?.reps}, ReviewLogEntry count: ${logs.length}`);

    // Clean up test card
    await prisma.reviewLogEntry.deleteMany({ where: { cardId: card.id } });
    await prisma.card.delete({ where: { id: card.id } });
  } catch (e: any) {
    console.error('Concurrency test error:', e.message);
  }

  // Edge Case 5: Extremely long rawText (e.g. 10,000 words)
  console.log('\n5. Ingesting very large text payload (10,000 words)...');
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) throw new Error('No deck found');

    const paragraph = 'Mitochondria generate ATP through oxidative phosphorylation using a proton gradient created by the electron transport chain across the inner mitochondrial membrane. ';
    const bigText = paragraph.repeat(500); // ~10,000 words

    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/decks/${deck.id}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: bigText }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    console.log(`Large text ingest status: ${res.status}, elapsed: ${elapsed}ms, chunks: ${data.chunks?.length}`);
  } catch (e: any) {
    console.error('Large text ingest error:', e.message);
  }
}

runEdgeCases()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
