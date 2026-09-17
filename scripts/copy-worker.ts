import * as fs from 'fs';
import * as path from 'path';

const src = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
const dest = path.resolve('.next/server/chunks/pdf.worker.mjs');

fs.copyFileSync(src, dest);
console.log('Copied pdf.worker.mjs to .next/server/chunks/pdf.worker.mjs');
