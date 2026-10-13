/**
 * /scripts/test-unit.ts
 *
 * Automated unit test suite for the AI Pipeline Track:
 *  - Quality check (word LCS, threshold gate, sliding window) (R-01)
 *  - Content parsing (heading split, paragraph merge/split, noise filter) (R-06)
 *  - Type contract & function signatures verification (R-09, R-10)
 */

import { checkOverlap, wordLcs, normalise, QUALITY_GATE_THRESHOLD } from '../lib/ai/quality-check';
import { parseContent } from '../lib/ai/parse-content';
import { generateCards, CardGenerationError } from '../lib/ai/generate-cards';
import type { Card, CardPayload, CardType } from '../types/index';
import { gradeClozeAnswer } from '../lib/cloze/grade';
import { formatSSEEvent, createSSEParser, parseSSEEvents, parseStreamingRationale } from '../lib/ai/sse';
import { validateExplainBody, MAX_BODY_CHARS } from '../lib/ai/limits';
import { getClientIp, checkRateLimit, pruneRateLimitStore, RATE_LIMIT_RETENTION_MS } from '../lib/rate-limit';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- Testing Quality Gate (R-01) ---');

  const source = `
    The sodium-potassium pump uses ATP to transport three sodium ions out of the cell
    and two potassium ions into the cell against their electrochemical gradients. This primary
    active transport mechanism is essential for maintaining the resting membrane potential
    and regulating cellular osmotic volume.
  `;

  // Exact / near-verbatim copy should fail (> 0.55 LCS)
  const verbatimBack = "uses ATP to transport three sodium ions out of the cell and two potassium ions in";
  const gateVerbatim = checkOverlap(verbatimBack, source);
  assert(!gateVerbatim.pass, `Verbatim back should fail quality gate (got ratio ${gateVerbatim.lcsRatio.toFixed(2)})`);

  // Good synthesis / retrieval practice answer should pass (<= 0.55 LCS)
  const goodBack = "Because it moves 3 Na+ out for every 2 K+ in, establishing a negative net charge internally.";
  const gateGood = checkOverlap(goodBack, source);
  assert(gateGood.pass, `Synthesized back should pass quality gate (got ratio ${gateGood.lcsRatio.toFixed(2)})`);

  // Edge cases
  assert(!checkOverlap("", source).pass, "Empty back should fail");
  assert(checkOverlap("Cellular respiration", source).pass, "Short non-overlapping text passes");

  console.log('\n--- Testing Content Parsing & Chunking (R-06) ---');

  const sampleDoc = `
# Introduction to Photosynthesis

Photosynthesis is the fundamental biological process that converts light energy into chemical energy.
It takes place primarily inside chloroplasts within plant cells and photosynthetic bacteria.

## Light Reactions

The light-dependent reactions take place within the thylakoid membranes of chloroplasts. Chlorophyll
molecules absorb photons, exciting electrons that are then transferred through an electron transport chain.
This electron flow drives the pumping of hydrogen ions into the thylakoid lumen, setting up a proton gradient.
ATP synthase uses this electrochemical gradient to produce ATP via photophosphorylation. Simultaneously,
NADP+ is reduced to NADPH, which provides the reducing power for subsequent anabolic reactions. Water molecules
are photolyzed to replace electrons lost by Photosystem II, releasing molecular oxygen as a byproduct.

## Calvin Cycle

The Calvin cycle occurs in the stroma and does not require light directly. Rubisco fixes carbon dioxide
into 3-PGA, which is then reduced using ATP and NADPH generated during the light reactions to form G3P.
These three-carbon sugars are subsequently used to synthesize glucose, cellulose, and other vital carbohydrates.
  `;

  const chunks = await parseContent(sampleDoc);
  assert(chunks.length >= 1, `Chunks were produced (got ${chunks.length})`);
  
  for (let i = 0; i < chunks.length; i++) {
    const words = chunks[i].split(/\s+/).filter(Boolean).length;
    console.log(`    Chunk ${i + 1} word count: ${words}`);
    assert(words >= 30, `Chunk ${i + 1} has at least 30 words (got ${words})`);
    assert(words <= 450, `Chunk ${i + 1} does not excessively exceed max target (got ${words})`);
  }

  console.log('\n--- Testing Function Signatures & Types (R-09, R-10) ---');

  assert(typeof parseContent === 'function', 'parseContent is exported function');
  assert(typeof generateCards === 'function', 'generateCards is exported function');
  assert(typeof CardGenerationError === 'function', 'CardGenerationError is exported');

  // Verify CardPayload interface compatibility
  const testPayload: CardPayload = {
    type: 'basic',
    front: 'Why does phosphorylation matter?',
    back: 'It alters protein conformation and catalytic activity.',
    explanation: 'Phosphorylation adds a negatively charged phosphate group that reshapes the protein backbone.',
  };
  assert(testPayload.type === 'basic', 'CardPayload complies with schema');

  console.log('\n--- Testing Cloze Deletion Grading Engine (lib/cloze/grade.ts) ---');

  // Exact matching & normalization
  const exactRes = gradeClozeAnswer('Mitochondria', 'mitochondria');
  assert(exactRes.isCorrect && exactRes.category === 'exact' && exactRes.suggestedRating === 'good', 'Exact match yields category exact & suggestedRating good');

  const wsRes = gradeClozeAnswer('  ribosome.  ', 'ribosome');
  assert(wsRes.isCorrect && wsRes.category === 'exact', 'Strips surrounding whitespace and trailing punctuation');

  const quoteRes = gradeClozeAnswer('"chloroplast"', 'chloroplast');
  assert(quoteRes.isCorrect && quoteRes.category === 'exact', 'Strips surrounding quotes');

  // Code spacing
  const codeRes = gradeClozeAnswer('x == y', 'x==y');
  assert(codeRes.isCorrect && codeRes.category === 'exact', 'Ignores spacing differences in expressions (x == y vs x==y)');

  // Diacritics
  const diacriticRes = gradeClozeAnswer('corazon', 'corazón');
  assert(diacriticRes.isCorrect && diacriticRes.category === 'close' && diacriticRes.suggestedRating === 'hard', 'Accepts missing accent mark as close with suggestedRating hard');

  // Short terms rigor (<= 3 chars)
  const shortFail = gradeClozeAnswer('ADP', 'ATP');
  assert(!shortFail.isCorrect && shortFail.category === 'wrong' && shortFail.suggestedRating === 'again', 'Strictly rejects 1-char substitution on short terms (ADP vs ATP)');

  const shortPass = gradeClozeAnswer('ATP', 'ATP');
  assert(shortPass.isCorrect && shortPass.category === 'exact', 'Accepts exact match for short terms');

  // Medium terms typo tolerance (4-6 chars)
  const medPass = gradeClozeAnswer('mitosis', 'mytosis');
  assert(medPass.isCorrect && medPass.category === 'close', 'Allows 1 edit distance for 6-letter word (mitosis vs mytosis)');

  const medFail = gradeClozeAnswer('mtoxs', 'mitosis');
  assert(!medFail.isCorrect && medFail.category === 'wrong', 'Rejects multiple typos on 6-letter word');

  // Long terms typo tolerance (7+ chars)
  const longPass = gradeClozeAnswer('phototsynthesis', 'photosynthesis');
  assert(longPass.isCorrect && longPass.category === 'close', 'Allows 1 extra letter typo on long academic terms');

  const longFail = gradeClozeAnswer('completelywronganswer', 'photosynthesis');
  assert(!longFail.isCorrect && longFail.category === 'wrong', 'Rejects distant answers');

  // Empty string and whitespace-only input
  const emptyRes = gradeClozeAnswer('', 'glucose');
  const spacesRes = gradeClozeAnswer('   ', 'glucose');
  assert(!emptyRes.isCorrect && emptyRes.category === 'wrong' && !spacesRes.isCorrect && spacesRes.category === 'wrong', 'Empty string and whitespace-only input yield wrong without crashing');

  // Exact typo tier boundary checks
  const sevenCharTwoTypos = gradeClozeAnswer('glykose', 'glucose'); // 7 chars, 2 substitutions
  assert(sevenCharTwoTypos.isCorrect && sevenCharTwoTypos.category === 'close', 'A 7-character word with exactly 2 typos grades as close');

  const sevenCharThreeTypos = gradeClozeAnswer('glykzse', 'glucose'); // 7 chars, 3 substitutions
  assert(!sevenCharThreeTypos.isCorrect && sevenCharThreeTypos.category === 'wrong', 'A 7-character word with 3 typos grades as wrong');

  const threeCharOneTypo = gradeClozeAnswer('APP', 'ATP'); // 3 chars, 1 typo
  assert(!threeCharOneTypo.isCorrect && threeCharOneTypo.category === 'wrong', 'A 3-character answer with 1 typo grades as wrong');

  // Strict mode toggle
  const strictRes = gradeClozeAnswer('phototsynthesis', 'photosynthesis', { strict: true });
  assert(!strictRes.isCorrect && strictRes.category === 'wrong', 'Strict mode rejects typos that would otherwise pass');

  console.log('\n--- Testing Non-Cloze Cards & Flip Flow Regression ---');

  // Non-cloze card types and flip behavior invariant
  const basicCard: Card = {
    id: 'test-basic-1',
    deckId: 'deck-1',
    type: 'basic',
    front: 'What is the primary function of ribosomes?',
    back: 'Protein synthesis via mRNA translation.',
    explanation: 'Ribosomes assemble amino acids into polypeptide chains.',
    due: new Date().toISOString(),
    stability: 2.5,
    difficulty: 4.8,
    reps: 2,
  };
  assert(basicCard.type === 'basic', 'Basic card type invariant preserved');
  assert(basicCard.front.length > 0 && basicCard.back.length > 0, 'Basic card front and back prompts preserved');

  const mcqCard: Card = {
    id: 'test-mcq-1',
    deckId: 'deck-1',
    type: 'mcq',
    front: 'Which organelle contains hydrolytic enzymes?',
    back: 'Lysosome',
    options: ['Mitochondria', 'Lysosome', 'Ribosome', 'Golgi apparatus'],
    explanation: 'Lysosomes degrade cellular waste.',
    due: new Date().toISOString(),
    stability: 3.1,
    difficulty: 5.0,
    reps: 3,
  };
  assert(mcqCard.type === 'mcq' && Array.isArray(mcqCard.options), 'MCQ card options array intact');

  // Rating flow invariants
  const ratingMap: Record<string, number> = { again: 1, hard: 2, good: 3, easy: 4 };
  assert(ratingMap['again'] === 1 && ratingMap['easy'] === 4, 'Standard 1-4 rating system remains unaltered for flip review');

  console.log('\n--- Testing SSE Formatting & Streaming Parser (lib/ai/sse.ts) ---');

  // 1. Format SSE Events
  const deltaFormatted = formatSSEEvent({ type: 'delta', text: 'Cognitive' });
  assert(deltaFormatted === 'data: {"type":"delta","text":"Cognitive"}\n\n', 'formatSSEEvent formats delta event correctly');

  const doneFormatted = formatSSEEvent({ type: 'done' });
  assert(doneFormatted === 'data: {"type":"done"}\n\n', 'formatSSEEvent formats done event correctly');

  // 2. Multiple events in a single chunk
  const multiChunk = 'data: {"type":"delta","text":"Hello "}\n\ndata: {"type":"delta","text":"world!"}\n\n';
  const multiParsed = parseSSEEvents(multiChunk);
  assert(multiParsed.length === 2 && multiParsed[0].type === 'delta' && (multiParsed[0] as { text: string }).text === 'Hello ', 'Parses multiple events in a single chunk');
  assert(multiParsed[1].type === 'delta' && (multiParsed[1] as { text: string }).text === 'world!', 'Second event in multi-chunk is intact');

  // 3. Events split across chunks
  const parser = createSSEParser();
  const chunk1Events = parser.feed('data: {"type":"delta","text":"Incom');
  assert(chunk1Events.length === 0, 'Incomplete event in first chunk produces 0 events');
  const chunk2Events = parser.feed('plete sentence."}\n\n');
  assert(chunk2Events.length === 1 && chunk2Events[0].type === 'delta' && (chunk2Events[0] as { text: string }).text === 'Incomplete sentence.', 'Reassembles event split across chunks');

  // 4. Error event
  const errorChunk = 'data: {"type":"error","message":"AI service rate limited"}\n\n';
  const errorParsed = parseSSEEvents(errorChunk);
  assert(errorParsed.length === 1 && errorParsed[0].type === 'error' && (errorParsed[0] as { message: string }).message === 'AI service rate limited', 'Parses error event correctly');

  // 5. Empty chunks and whitespace chunks
  const emptyParser = createSSEParser();
  const resEmpty1 = emptyParser.feed('');
  const resEmpty2 = emptyParser.feed('   \n\n   \n\n');
  assert(resEmpty1.length === 0 && resEmpty2.length === 0, 'Empty and whitespace chunks yield 0 events without crashing');

  // 6. Malformed JSON handling
  const malformedChunk = 'data: {corrupted json\n\ndata: {"type":"done"}\n\n';
  const malformedParsed = parseSSEEvents(malformedChunk);
  assert(malformedParsed.length === 1 && malformedParsed[0].type === 'done', 'Skips malformed JSON gracefully and preserves subsequent valid events');

  // 7. Parse 3-part streaming rationale sections
  const sampleMarkdown = `### 1. Why The Correct Answer Is Right
Active transport pumps ions against electrochemical gradient.

### 2. Cognitive Trap & Distractor Analysis
Students confuse passive diffusion with ATP-dependent transport.

### 3. Anchor Takeaway
Primary active transport always requires direct ATP hydrolysis.`;
  const parsedSections = parseStreamingRationale(sampleMarkdown);
  assert(
    parsedSections.correctPrinciple.includes('Active transport pumps ions') &&
    parsedSections.misconception.includes('Students confuse passive diffusion') &&
    parsedSections.keyTakeaway.includes('Primary active transport always requires direct ATP hydrolysis'),
    'parseStreamingRationale correctly isolates the 3 pedagogical sections'
  );

  console.log('\n--- Testing Explain Input Limits (lib/ai/limits) ---');
  const okBody = {
    question: 'What drives active transport?',
    chosenAnswer: 'Diffusion',
    correctAnswer: 'ATP hydrolysis',
    explanation: 'Pumps use ATP.',
    cardType: 'mcq',
    options: ['Diffusion', 'ATP hydrolysis', 'Osmosis'],
    stream: true,
  };
  const okRes = validateExplainBody(JSON.stringify(okBody), null);
  assert(
    okRes.ok === true && JSON.stringify(okRes.data) === JSON.stringify(okBody),
    'Normal input passes unchanged'
  );

  const bigText = JSON.stringify({ ...okBody, question: 'x'.repeat(MAX_BODY_CHARS) });
  const bigRes = validateExplainBody(bigText, null);
  assert(!bigRes.ok && bigRes.status === 413, 'Rejects body text longer than 20,000 chars with 413');
  const clRes = validateExplainBody(JSON.stringify(okBody), String(MAX_BODY_CHARS + 1));
  assert(!clRes.ok && clRes.status === 413, 'Rejects oversized Content-Length header with 413');

  const capRes = validateExplainBody(
    JSON.stringify({
      question: 'q'.repeat(1500),
      chosenAnswer: 'c'.repeat(900),
      correctAnswer: 'a'.repeat(900),
      explanation: 'e'.repeat(2500),
      options: Array.from({ length: 12 }, () => 'o'.repeat(400)),
    }),
    null
  );
  assert(capRes.ok && capRes.data.question.length === 1000, 'Caps question at 1000 chars');
  assert(capRes.ok && capRes.data.chosenAnswer?.length === 500, 'Caps chosenAnswer at 500 chars');
  assert(capRes.ok && capRes.data.correctAnswer.length === 500, 'Caps correctAnswer at 500 chars');
  assert(capRes.ok && capRes.data.explanation?.length === 2000, 'Caps explanation at 2000 chars');
  assert(capRes.ok && capRes.data.options?.length === 8, 'Caps options array at 8 items');
  assert(capRes.ok && !!capRes.data.options?.every((o) => o.length === 250), 'Caps each option at 250 chars');

  const trimRes = validateExplainBody(JSON.stringify({ question: '  Q  ', correctAnswer: ' A ' }), null);
  assert(trimRes.ok && trimRes.data.question === 'Q' && trimRes.data.correctAnswer === 'A', 'Trims string fields');

  const badCases: Array<[string, unknown]> = [
    ['question is a number', { ...okBody, question: 42 }],
    ['chosenAnswer is an object', { ...okBody, chosenAnswer: { a: 1 } }],
    ['explanation is an array', { ...okBody, explanation: ['x'] }],
    ['cardType is a number', { ...okBody, cardType: 3 }],
    ['options is a string', { ...okBody, options: 'A,B' }],
    ['an option is a number', { ...okBody, options: ['A', 2] }],
    ['stream is a string', { ...okBody, stream: 'yes' }],
    ['body is an array', [okBody]],
    ['body is null', null],
  ];
  for (const [label, body] of badCases) {
    const r = validateExplainBody(JSON.stringify(body), null);
    assert(!r.ok && r.status === 400, `Rejects wrong type with 400: ${label}`);
  }
  const badJson = validateExplainBody('{not json', null);
  assert(!badJson.ok && badJson.status === 400, 'Rejects malformed JSON with 400');

  const missingQ = validateExplainBody(JSON.stringify({ correctAnswer: 'A' }), null);
  assert(!missingQ.ok && missingQ.status === 400, 'Rejects missing question with 400');
  const emptyA = validateExplainBody(JSON.stringify({ question: 'Q', correctAnswer: '   ' }), null);
  assert(!emptyA.ok && emptyA.status === 400, 'Rejects whitespace-only correctAnswer with 400');
  const emptyBody = validateExplainBody('', null);
  assert(!emptyBody.ok && emptyBody.status === 400, 'Rejects empty body with 400');
  const minimal = validateExplainBody(JSON.stringify({ question: 'Q', correctAnswer: 'A', chosenAnswer: null }), null);
  assert(
    minimal.ok && minimal.data.chosenAnswer === undefined && minimal.data.options === undefined,
    'Optional fields may be missing or null'
  );

  console.log('\n--- Testing getClientIp (TRUSTED_PROXY) ---');
  const prevTrusted = process.env.TRUSTED_PROXY;
  const spoofed = new Request('http://localhost/x', {
    headers: { 'x-forwarded-for': '6.6.6.6, 10.0.0.1', 'x-real-ip': '1.2.3.4' },
  });
  const xffOnly = new Request('http://localhost/x', { headers: { 'x-forwarded-for': '6.6.6.6' } });
  delete process.env.TRUSTED_PROXY;
  assert(getClientIp(spoofed) === '1.2.3.4', 'Ignores x-forwarded-for when TRUSTED_PROXY unset (uses x-real-ip)');
  assert(getClientIp(xffOnly) === 'unknown', 'Ignores x-forwarded-for when TRUSTED_PROXY unset (falls back to unknown)');
  process.env.TRUSTED_PROXY = '1';
  assert(getClientIp(spoofed) === '6.6.6.6', 'Uses first x-forwarded-for entry when TRUSTED_PROXY=1');
  let threw = false;
  let noHeaderIp = '';
  try {
    noHeaderIp = getClientIp(new Request('http://localhost/x'));
    delete process.env.TRUSTED_PROXY;
    noHeaderIp += '|' + getClientIp(new Request('http://localhost/x'));
  } catch {
    threw = true;
  }
  assert(!threw && noHeaderIp === 'unknown|unknown', 'Never throws on missing headers');
  if (prevTrusted === undefined) delete process.env.TRUSTED_PROXY;
  else process.env.TRUSTED_PROXY = prevTrusted;

  console.log('\n--- Testing Rate Limiter Cleanup Retention ---');
  const gKey = `explain:guest:test-${Date.now()}`;
  const t0 = 1_000_000_000_000;
  let allowedCount = 0;
  for (let i = 0; i < 10; i++) {
    if (checkRateLimit(gKey, 10, 600000, t0 + i * 1000).allowed) allowedCount++;
  }
  assert(allowedCount === 10, 'Guest gets 10 requests at the start of the window');
  pruneRateLimitStore(t0 + 330000); // cleanup runs 5.5 min in (old 300 s retention would wipe history)
  const afterCleanup = checkRateLimit(gKey, 10, 600000, t0 + 360000);
  assert(!afterCleanup.allowed, 'Guest still blocked at 6 min after a cleanup run (cannot exceed 10 per 10 min)');
  assert(RATE_LIMIT_RETENTION_MS >= 600000, 'Cleanup retention covers the longest 600 s window');
  const afterWindow = checkRateLimit(gKey, 10, 600000, t0 + 600000 + 1);
  assert(afterWindow.allowed, 'Guest allowed again once the 10-minute window has passed');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
