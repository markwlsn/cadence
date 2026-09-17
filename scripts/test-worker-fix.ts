import * as path from 'path';
import { pathToFileURL } from 'url';

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

async function testWorkerFix() {
  const mod = await import('pdf-parse');
  const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  const workerUrl = pathToFileURL(workerPath).href;
  console.log('Worker URL:', workerUrl);

  mod.PDFParse.setWorker(workerUrl);

  const parser = new mod.PDFParse({ data: minimalPdfBuffer });
  const result = await parser.getText();
  console.log('Result text:', result.text);
}

testWorkerFix().catch(console.error);
