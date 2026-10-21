# TypeScript Multi-Agent Client Blueprint (`lib/ai/orchestrator.ts`)
Design for upcoming sprint:
```ts
export async function orchestrateDeckGeneration(chunks: string[], deckId: string): Promise<Card[]> {
  const plan = await claudeSupervisor.plan(chunks);
  const candidateCards = await Promise.all(chunks.map(chunk => geminiWorker.draftCards(chunk)));
  return await claudeSupervisor.validateAndAssemble(candidateCards.flat(), deckId);
}
```
