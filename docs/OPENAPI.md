# API documentation

The machine-readable OpenAPI 3.1 document is served at `GET /api/openapi.json`.

## Main endpoints
- `GET /api/health` — service health; no login required.
- `POST /api/auth/register`, `POST /api/auth/login` — create session / sign in.
- `GET /api/ai/status` — configured providers and cache count (login required).
- `POST /api/ai/explain` — `{ "topic": "Binary search", "level": "beginner" }`.
- `POST /api/ai/quiz` — `{ "topic": "Binary search", "count": 5, "difficulty": "intermediate" }`.
- `POST /api/ai/compare` — runs the same topic explanation against each configured provider and returns per-model output, duration, and errors.

Protected endpoints require `Authorization: Bearer <token>`. AI output is schema-validated, retried once if invalid, and rejected with a safe JSON error if still unusable. Explanation/quiz responses are cached in memory for five minutes. Cache is per-process and clears on restart.

## Provider configuration
Set `AI_PROVIDER=auto` and configure two or more of `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` to run true live comparisons. Provider keys stay on the server. With no keys, the app uses its clearly labelled offline mock provider; this is useful for UI demos but is not a second live LLM. API providers may have usage costs and rate limits.
