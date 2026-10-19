# Gemini Flash Worker Pool Specification
- Model: `gemini-2.5-flash` / `gemini-3.5-flash` cascade pool.
- Concurrency: Up to 5 parallel chunk processing workers via `Promise.allSettled`.
- SLA: Sub-500ms time to first token (TTFT) for draft retrieval card generation.
