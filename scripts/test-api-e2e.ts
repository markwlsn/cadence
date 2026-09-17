// E2E test helper

async function test() {
  const res = await globalThis.fetch('http://localhost:3000/api/decks/deck-bio-101/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chunks: ['Photosynthesis converts light energy into chemical energy in chloroplasts.'],
    }),
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

test();
