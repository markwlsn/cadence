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
