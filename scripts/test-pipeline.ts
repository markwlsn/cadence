/**
 * /scripts/test-pipeline.ts
 *
 * Standalone smoke-test for the AI content pipeline.
 * Run with:   npm run test:pipeline
 *
 * Prerequisites:
 *   1. Create a .env.local file in the project root with:
 *        ANTHROPIC_API_KEY=sk-ant-...
 *   2. Optionally set ANTHROPIC_MODEL to override the default model.
 *
 * What this script does:
 *   1. Loads environment variables from .env.local
 *   2. Runs parseContent on a sample biology paragraph
 *   3. Runs generateCards on the resulting chunks
 *   4. Pretty-prints each Card for manual quality review
 *   5. Prints a summary: type distribution, quality gate stats
 */

// Load .env.local before any imports that read process.env
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✓ Loaded environment from ${envPath}\n`);
} else {
  console.warn(
    `⚠  No .env.local found at ${envPath}.\n` +
    `   Create it with: ANTHROPIC_API_KEY=sk-ant-...\n`
  );
}

import { parseContent } from '../lib/ai/parse-content';
import { generateCards, CardGenerationError } from '../lib/ai/generate-cards';
import type { Card } from '../types/index';

// ---------------------------------------------------------------------------
// Sample input — a substantive biology passage (mix of concepts, mechanisms,
// terminology) chosen to exercise all three card types.
// ---------------------------------------------------------------------------

const SAMPLE_TEXT = `
# Cellular Respiration

## Overview

Cellular respiration is the process by which cells convert glucose and oxygen into ATP, carbon dioxide, and water. Unlike photosynthesis, which stores energy, cellular respiration releases it in a controlled, stepwise manner so cells can capture the energy as ATP rather than losing it all as heat.

The overall equation is:
C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ~36–38 ATP

## Glycolysis

Glycolysis occurs in the cytoplasm and does not require oxygen. One molecule of glucose (6 carbons) is split into two molecules of pyruvate (3 carbons each). This process yields a net gain of 2 ATP and 2 NADH molecules.

An important feature of glycolysis is that it does not depend on oxygen — it is anaerobic. Under low-oxygen conditions, many cells rely entirely on glycolysis for energy, producing lactate (in animals) or ethanol (in yeast) as a byproduct to regenerate NAD⁺ and keep glycolysis running.

## The Krebs Cycle (Citric Acid Cycle)

Pyruvate from glycolysis is converted to acetyl-CoA and enters the Krebs cycle in the mitochondrial matrix. For each turn of the cycle (one acetyl-CoA molecule), the cell produces 3 NADH, 1 FADH₂, 1 GTP (equivalent to ATP), and releases 2 CO₂.

Because each glucose molecule produces two pyruvates, the Krebs cycle turns twice per glucose, yielding 6 NADH, 2 FADH₂, 2 GTP, and 4 CO₂ per glucose.

## Oxidative Phosphorylation and the Electron Transport Chain

The NADH and FADH₂ produced in earlier stages donate their electrons to protein complexes embedded in the inner mitochondrial membrane — the electron transport chain (ETC). As electrons move through the ETC from Complex I to Complex IV, they release energy that is used to pump protons (H⁺) from the mitochondrial matrix into the intermembrane space, creating a proton gradient.

This gradient represents stored potential energy. The enzyme ATP synthase (Complex V) allows protons to flow back down their gradient into the matrix, using the released energy to phosphorylate ADP into ATP. This process is called chemiosmosis.

Complex IV transfers the final electrons to molecular oxygen (O₂), reducing it to water. This is why oxygen is the final electron acceptor — without it, the ETC stalls, protons cannot be pumped, and ATP synthesis via chemiosmosis halts.

## Why Mitochondria Have a Double Membrane

The double-membrane architecture is critical for the proton gradient. The outer membrane is freely permeable to small molecules, but the inner membrane is highly impermeable — even to protons. This impermeability forces protons that are pumped by the ETC to re-enter only through ATP synthase, coupling electron flow directly to ATP production.

If the inner membrane were leaky (as in uncoupling proteins used in brown adipose tissue), protons would re-enter without driving ATP synthase, releasing energy as heat instead. This is how thermogenin/UCP1 generates body heat in newborns.
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Cadence — AI Pipeline Smoke Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Step 1: Parse content into chunks ──────────────────────────────────
  console.log('Step 1: Parsing content into chunks...\n');
  const chunks = await parseContent(SAMPLE_TEXT);
  console.log(`  → ${chunks.length} chunk(s) produced:\n`);
  chunks.forEach((chunk, i) => {
    const wc = chunk.split(/\s+/).filter(Boolean).length;
    const preview = chunk.slice(0, 80).replace(/\n/g, ' ');
    console.log(`  [Chunk ${i + 1}] ${wc} words — "${preview}..."`);
  });
  console.log();

  if (chunks.length === 0) {
    console.error('✗ parseContent returned no chunks. Check the input text.');
    process.exit(1);
  }

  // ── Step 2: Generate cards ─────────────────────────────────────────────
  console.log('Step 2: Generating cards via Claude...\n');
  const DECK_ID = 'test-deck-001';

  let cards: Card[];
  try {
    cards = await generateCards(chunks, DECK_ID);
  } catch (err) {
    if (err instanceof CardGenerationError) {
      console.error('✗ CardGenerationError:', err.message);
      console.error('  Chunk snippet:', err.chunk.slice(0, 200));
      console.error('  Attempts:', err.attempts);
      process.exit(1);
    }
    throw err;
  }

  // ── Step 3: Print cards ────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Generated ${cards.length} card(s)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  cards.forEach((card, i) => {
    console.log(`┌─ Card ${i + 1} ─ type: ${card.type.toUpperCase()} ─────────────────────────`);
    console.log(`│ FRONT: ${card.front}`);
    console.log(`│ BACK:  ${card.back}`);
    if (card.options && card.options.length > 0) {
      console.log(`│ OPTIONS:`);
      card.options.forEach((opt, j) => {
        const marker = j === 0 ? '✓' : '✗';
        console.log(`│   ${marker} ${opt}`);
      });
    }
    console.log(`│ EXPLANATION: ${card.explanation}`);
    console.log('└──────────────────────────────────────────────────────────\n');
  });

  // ── Step 4: Summary ────────────────────────────────────────────────────
  const typeCounts = { basic: 0, cloze: 0, mcq: 0 };
  for (const card of cards) {
    typeCounts[card.type]++;
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total cards:  ${cards.length}`);
  console.log(`  basic:        ${typeCounts.basic}`);
  console.log(`  cloze:        ${typeCounts.cloze}`);
  console.log(`  mcq:          ${typeCounts.mcq}`);
  console.log(`  Chunks used:  ${chunks.length}`);
  console.log();

  // Check R-02: at least one of each type per 5 chunks
  const violations: string[] = [];
  if (typeCounts.basic === 0) violations.push('No "basic" cards generated.');
  if (typeCounts.cloze === 0) violations.push('No "cloze" cards generated.');
  if (typeCounts.mcq === 0) violations.push('No "mcq" cards generated.');

  if (violations.length > 0) {
    console.warn('⚠  Variety check (R-02):');
    violations.forEach((v) => console.warn(`   - ${v}`));
  } else {
    console.log('✓ Card type variety check passed (R-02)');
  }

  console.log('\n✓ Smoke test complete. Review cards above for quality.\n');
  console.log('Quality review checklist:');
  console.log('  □ No "back" is a copy-paste of a sentence from the source');
  console.log('  □ "cloze" cards have exactly one {{blank}}');
  console.log('  □ MCQ distractors are plausible (not random)');
  console.log('  □ "explanation" fields add genuine context');
  console.log('  □ Causal/mechanism questions outnumber definition questions');
}

main().catch((err) => {
  console.error('Unhandled error in test-pipeline:', err);
  process.exit(1);
});
