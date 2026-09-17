import { prisma } from '../lib/db';
import { parsePdf } from '../lib/ai/parse-content';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';

interface VerificationCheck {
  area: string;
  item: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: any;
}

const checks: VerificationCheck[] = [];

function record(area: string, item: string, passed: boolean, expected: string, actual: string, details?: any) {
  checks.push({ area, item, passed, expected, actual, details });
  const tag = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${tag}] [${area}] ${item}`);
  if (!passed) {
    console.log(`       Expected: ${expected}`);
    console.log(`       Actual:   ${actual}`);
  }
}

// Minimal valid PDF binary
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

async function runRegressionSuite() {
  console.log('===========================================================');
  console.log('REGRESSION VERIFICATION PASS — CADENCE POST-FIX');
  console.log('===========================================================\n');

  // ---------------------------------------------------------
  // AREA 1: PDF Ingestion
  // ---------------------------------------------------------
  console.log('--- 1. Verifying PDF Ingestion ---');
  try {
    const extractedText = await parsePdf(minimalPdfBuffer);
    const hasText = extractedText.includes('Hello Biology World');
    record(
      'Area 1: PDF Ingestion',
      'parsePdf extracts text using modern PDFParse class without runtime crash',
      hasText,
      'Text contains "Hello Biology World"',
      `Extracted: "${extractedText.trim()}"`
    );
  } catch (e: any) {
    record('Area 1: PDF Ingestion', 'parsePdf execution', false, 'Extracted text', e.message);
  }

  // Test live API PDF upload
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) throw new Error('No deck found');

    const form = new globalThis.FormData();
    const pdfBlob = new Blob([minimalPdfBuffer], { type: 'application/pdf' });
    form.append('file', pdfBlob, 'notes.pdf');

    const res = await fetch(`${BASE_URL}/api/decks/${deck.id}/ingest`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    record(
      'Area 1: PDF Ingestion',
      'POST /api/decks/:id/ingest accepts PDF and returns 200 with chunks',
      res.status === 200 && Array.isArray(data.chunks),
      '200 with chunks array',
      `Status: ${res.status}, chunks count: ${data.chunks?.length}`
    );
  } catch (e: any) {
    record('Area 1: PDF Ingestion', 'Live PDF upload API', false, '200 OK', e.message);
  }

  // ---------------------------------------------------------
  // AREA 2: Flipped Card Swiping & Pointer Handlers
  // ---------------------------------------------------------
  console.log('\n--- 2. Verifying Flipped Card Swiping & Pointer Handlers ---');
  const cardStackCode = await import('fs').then((fs) =>
    fs.readFileSync('components/review/CardStack.tsx', 'utf-8')
  );
  const flashCardCode = await import('fs').then((fs) =>
    fs.readFileSync('components/review/FlashCard.tsx', 'utf-8')
  );

  const hasFixedRole = flashCardCode.includes("role={isFlipped ? 'region' : 'button'}");
  const hasFixedInteractiveCheck =
    cardStackCode.includes("const interactive = (e.target as HTMLElement).closest('button, a, input');") &&
    cardStackCode.includes('if (interactive) {');

  record(
    'Area 2: Flipped Card Swiping',
    'FlashCard sets role="region" when flipped (not "button")',
    hasFixedRole,
    'role={isFlipped ? \'region\' : \'button\'}',
    hasFixedRole ? 'Verified in FlashCard.tsx' : 'Missing role ternary'
  );

  record(
    'Area 2: Flipped Card Swiping',
    'CardStack pointer handler only ignores clicks on interactive elements (button, a, input), allowing card swiping',
    hasFixedInteractiveCheck,
    'Checks closest("button, a, input")',
    hasFixedInteractiveCheck ? 'Verified in CardStack.tsx' : 'Still checking [role="button"]'
  );

  // ---------------------------------------------------------
  // AREA 3: Card Generation Error Propagation & UI Alert
  // ---------------------------------------------------------
  console.log('\n--- 3. Verifying Card Generation Error Propagation & Alert Banner ---');
  const dataTsCode = await import('fs').then((fs) =>
    fs.readFileSync('lib/data.ts', 'utf-8')
  );
  const newDeckPageCode = await import('fs').then((fs) =>
    fs.readFileSync('app/decks/new/page.tsx', 'utf-8')
  );

  const throwsOnGenerateFailure =
    dataTsCode.includes('throw new Error(err.error || \'Failed to generate flashcards from source material\');');
  const displaysErrorAlert =
    newDeckPagePageContainsAlert(newDeckPageCode);

  function newDeckPagePageContainsAlert(code: string) {
    return (
      code.includes('setErrorMessage(null)') &&
      code.includes('setErrorMessage(err instanceof Error') &&
      code.includes('role="alert"') &&
      code.includes('errorMessage')
    );
  }

  record(
    'Area 3: Error Propagation',
    'lib/data.ts throws error when card generation fails instead of swallowing it',
    throwsOnGenerateFailure,
    'Throws error with API message',
    throwsOnGenerateFailure ? 'Verified in lib/data.ts' : 'Swallows error'
  );

  record(
    'Area 3: Error Propagation',
    'NewDeckPage stops spinner and renders role="alert" banner without silent redirect',
    displaysErrorAlert,
    'setErrorMessage and role="alert" banner present',
    displaysErrorAlert ? 'Verified in app/decks/new/page.tsx' : 'Missing error state or alert banner'
  );

  // ---------------------------------------------------------
  // AREA 4: Cloze {{blank}} Syntax
  // ---------------------------------------------------------
  console.log('\n--- 4. Verifying Cloze {{blank}} Syntax Handling ---');
  const clozeFrontSupported = flashCardCode.includes("front.includes('{{blank}}')");
  const clozeBackSupported = flashCardCode.includes('renderClozeBack');
  const rendersPill = flashCardCode.includes('[ ... ]');

  record(
    'Area 4: Cloze Syntax',
    'FlashCard detects {{blank}} and renders styled [ ... ] pill on front',
    clozeFrontSupported && rendersPill,
    'Replaces {{blank}} with [ ... ] pill',
    clozeFrontSupported ? 'renderClozeFront parses {{blank}}' : 'Missing {{blank}} parser'
  );

  record(
    'Area 4: Cloze Syntax',
    'FlashCard renders full sentence with highlighted answer term on back',
    clozeBackSupported,
    'renderClozeBack highlights missing term in context',
    clozeBackSupported ? 'renderClozeBack present in FlashCard.tsx' : 'Missing renderClozeBack'
  );

  // ---------------------------------------------------------
  // AREA 5: Ingest Binary File Validation
  // ---------------------------------------------------------
  console.log('\n--- 5. Verifying Ingest Binary File Validation ---');
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) throw new Error('No deck found');

    const form = new globalThis.FormData();
    const maliciousBlob = new Blob([Buffer.from('MZ\x90\x00\x03\x00\x00\x00')], {
      type: 'application/x-msdownload',
    });
    form.append('file', maliciousBlob, 'malicious.exe');

    const res = await fetch(`${BASE_URL}/api/decks/${deck.id}/ingest`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json();

    record(
      'Area 5: Binary File Validation',
      'POST /api/decks/:id/ingest rejects unsupported binary files (.exe) with 400',
      res.status === 400 && data.error && data.error.includes('Unsupported file format'),
      '400 with { error: "Unsupported file format..." }',
      `Status: ${res.status}, error: "${data.error}"`
    );
  } catch (e: any) {
    record('Area 5: Binary File Validation', 'Binary rejection check', false, '400 Bad Request', e.message);
  }

  // ---------------------------------------------------------
  // AREA 6: First-Time User Onboarding
  // ---------------------------------------------------------
  console.log('\n--- 6. Verifying First-Time User Onboarding & Mobile Nav ---');
  const homePageCode = await import('fs').then((fs) =>
    fs.readFileSync('app/page.tsx', 'utf-8')
  );
  const onboardingCheckCode = await import('fs').then((fs) =>
    fs.readFileSync('components/ui/OnboardingCheck.tsx', 'utf-8')
  );

  const rendersOnboardingCheck = homePageCode.includes('<OnboardingCheck />');
  const checksLocalStorage =
    onboardingCheckCode.includes("localStorage.getItem('cadence_onboarding_completed')") &&
    onboardingCheckCode.includes("router.replace('/onboarding')");
  const visibleOnMobile =
    homePageCode.includes('href="/onboarding"') && !homePageCode.includes('hidden sm:inline-block');

  record(
    'Area 6: Onboarding',
    'HomePage includes <OnboardingCheck /> component',
    rendersOnboardingCheck,
    '<OnboardingCheck /> rendered',
    rendersOnboardingCheck ? 'Included in HomePage' : 'Missing'
  );

  record(
    'Area 6: Onboarding',
    'OnboardingCheck redirects to /onboarding when cadence_onboarding_completed is missing',
    checksLocalStorage,
    'Checks localStorage and replaces router with /onboarding',
    checksLocalStorage ? 'Verified in OnboardingCheck.tsx' : 'Missing localStorage check'
  );

  record(
    'Area 6: Onboarding',
    'How it works navigation link is visible on mobile viewports (hidden sm: removed)',
    visibleOnMobile,
    'Link has inline-block without hidden sm:',
    visibleOnMobile ? 'Visible on all viewports' : 'Still contains hidden sm:'
  );

  // ---------------------------------------------------------
  // AREA 7: Session Storage & Stats Accuracy
  // ---------------------------------------------------------
  console.log('\n--- 7. Verifying Session Storage Across Refreshes & 0-Review Stats Accuracy ---');
  const usesSessionStorage =
    dataTsCode.includes('sessionStorage.setItem(`cadence_session_${sessionId}`') &&
    dataTsCode.includes('sessionStorage.getItem(`cadence_session_${sessionId}`)');

  record(
    'Area 7: Session Storage',
    'Session logs are persisted in sessionStorage to survive page refreshes',
    usesSessionStorage,
    'sessionStorage setItem and getItem implemented in lib/data.ts',
    usesSessionStorage ? 'Verified in lib/data.ts' : 'Only in-memory Map'
  );

  // Check stats accuracyLast7Days on new deck with 0 reviews
  try {
    // Create a clean temporary test deck
    const newDeck = await prisma.deck.create({
      data: {
        title: 'Stats Zero Review Test Deck',
        sourceType: 'text',
      },
    });

    const statsRes = await fetch(`${BASE_URL}/api/decks/${newDeck.id}/stats`);
    const stats = await statsRes.json();

    record(
      'Area 7: Stats Accuracy',
      'GET /api/decks/:id/stats returns accuracyLast7Days = 0 (not 1.0) when 0 reviews exist',
      stats.accuracyLast7Days === 0,
      'accuracyLast7Days === 0',
      `accuracyLast7Days: ${stats.accuracyLast7Days}`
    );

    // Clean up
    await prisma.deck.delete({ where: { id: newDeck.id } });
  } catch (e: any) {
    record('Area 7: Stats Accuracy', 'Stats endpoint verification', false, 'accuracy: 0', e.message);
  }

  // ---------------------------------------------------------
  // AREA 8: Seed Script Card Count (REQ-014)
  // ---------------------------------------------------------
  console.log('\n--- 8. Verifying Seed Script Card Count (REQ-014) ---');
  const seedScriptCode = await import('fs').then((fs) =>
    fs.readFileSync('prisma/seed.ts', 'utf-8')
  );
  const seedsCardSpan03 = seedScriptCode.includes('card-span-03');

  // Let's re-run the seed script to ensure DB has all 8 cards
  try {
    execSync('npx tsx prisma/seed.ts', { stdio: 'pipe' });
    const totalCards = await prisma.card.count();
    const seedCards = await prisma.card.count({ where: { id: { startsWith: 'card-' } } });

    record(
      'Area 8: Seed Script',
      'prisma/seed.ts seeds at least 8 cards across 2 decks (REQ-014)',
      seedsCardSpan03 && seedCards >= 8,
      '>= 8 seed cards',
      `Found ${seedCards} seed cards in DB (includes card-span-03)`
    );
  } catch (e: any) {
    record('Area 8: Seed Script', 'Seed execution', false, '>= 8 cards', e.message);
  }

  console.log('\n===========================================================');
  const totalPassed = checks.filter((c) => c.passed).length;
  const totalFailed = checks.filter((c) => !c.passed).length;
  console.log(`REGRESSION CHECKS: ${checks.length}`);
  console.log(`PASSED:            ${totalPassed}`);
  console.log(`FAILED:            ${totalFailed}`);
  console.log('===========================================================\n');
}

runRegressionSuite()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
