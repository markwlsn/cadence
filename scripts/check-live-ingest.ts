import { prisma } from '../lib/db';

const minimalPdfBuffer = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n' +
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n' +
  '4 0 obj << /Length 44 >> stream\n' +
  'BT /F1 12 Tf 100 700 Td (Hello Biology World) Tj ET\n' +
  'endstream endobj\n' +
  '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n' +
  'xref\n' +
  '0 6\n' +
  '0000000000 65535 f \n' +
  '0000000009 00000 n \n' +
  '0000000058 00000 n \n' +
  '0000000115 00000 n \n' +
  '0000000244 00000 n \n' +
  '0000000339 00000 n \n' +
  'trailer << /Size 6 /Root 1 0 R >>\n' +
  'startxref\n' +
  '418\n' +
  '%%EOF'
);

async function checkIngestError() {
  const deck = await prisma.deck.findFirst();
  if (!deck) return;

  const form = new globalThis.FormData();
  const pdfBlob = new Blob([minimalPdfBuffer], { type: 'application/pdf' });
  form.append('file', pdfBlob, 'notes.pdf');

  const res = await fetch(`http://localhost:3000/api/decks/${deck.id}/ingest`, {
    method: 'POST',
    body: form,
  });

  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

checkIngestError();
