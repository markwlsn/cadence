# Study Material Pipeline Lifecycle

Documents the complete end-to-end ingest, chunk, generate, and review pipeline in Cadence.

## Stages
1. Ingestion of raw text or PDF documents.
2. Semantic boundary chunking (150-400 words).
3. Card synthesis via Gemini 3.5 Flash.
4. Quality gate verification (LCS overlap <= 55%).
5. Assessment queue compilation and FSRS scheduling.
