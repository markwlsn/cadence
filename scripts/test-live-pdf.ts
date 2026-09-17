import fs from 'fs';
import path from 'path';

async function testLivePdfUpload() {
  const filePath = path.resolve(process.cwd(), 'node_modules/pdf-parse/test/data/01-valid.pdf');
  const buffer = fs.readFileSync(filePath);

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('file', blob, '01-valid.pdf');

  console.log('Sending live multipart PDF upload to http://localhost:3000/api/decks/deck-bio-101/ingest...');
  const res = await fetch('http://localhost:3000/api/decks/deck-bio-101/ingest', {
    method: 'POST',
    body: formData,
  });

  console.log('Response status:', res.status);
  const data = await res.json();
  console.log('Response chunks count:', data.chunks?.length);
  if (data.chunks && data.chunks.length > 0) {
    console.log('First chunk preview:', data.chunks[0].slice(0, 150).replace(/\s+/g, ' ').trim());
    console.log('SUCCESS: Live HTTP PDF ingestion verified!');
  } else {
    console.error('FAILED: Chunks was empty or error returned:', data);
    process.exit(1);
  }
}

testLivePdfUpload().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
