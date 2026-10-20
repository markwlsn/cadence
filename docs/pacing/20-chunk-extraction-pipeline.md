# Parallel Chunk Extraction Pipeline
1. Documents (PDF / Markdown / Text) parsed via `pdf-parse` into clean text blocks.
2. Chunker segments content into 150–400 word cognitive chunks based on heading hierarchies.
3. Chunks distributed in parallel to Gemini worker nodes.
