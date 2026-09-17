import fs from 'fs';
import path from 'path';
import { parsePdf } from '../lib/ai/parse-content';

async function main() {
  const samplePdfPath = path.resolve(process.cwd(), 'node_modules/pdf-parse/test/data/01-valid.pdf');
  const buffer = fs.readFileSync(samplePdfPath);
  console.log('Testing parsePdf on real PDF file:', samplePdfPath);

  const text = await parsePdf(buffer);
  console.log('Successfully extracted text length:', text.length);
  console.log('Preview:', text.slice(0, 120).replace(/\s+/g, ' ').trim());
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
