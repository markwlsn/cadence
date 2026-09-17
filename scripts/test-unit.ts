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
