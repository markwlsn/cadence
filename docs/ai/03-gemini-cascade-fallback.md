# AI Provider Cascade & Fallback Architecture

Cadence utilizes a resilient multi-provider strategy:
1. Primary: Google Gemini (`gemini-1.5-flash`)
2. Secondary: Anthropic Claude SDK
3. Offline Heuristic Fallback: Ensures zero application crashes when offline or when API keys are unconfigured.
