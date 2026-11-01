# StudyPilot AI — mentor presentation (draft slides)

## Slide 1 — Problem
Students track deadlines across different documents and struggle to turn syllabi into a realistic study routine.

## Slide 2 — Solution
StudyPilot AI combines task tracking, PDF syllabus extraction, personalized study planning, topic explanations, and quizzes in one student workspace.

## Slide 3 — Architecture
React + Vite UI → Express REST API → authenticated SQLite data layer → AI service/provider adapters. PDF extraction and the deterministic scheduler remain available when AI providers are unavailable.

## Slide 4 — Agent workflow and guardrails
Validate request → select provider → call a narrow structured tool → validate schema → retry once on invalid output → return a safe error or use a supported fallback. Student task ownership is checked server-side.

## Slide 5 — Multi-model comparison
The Compare AI models action submits the same topic and level to every configured provider. The result view shows model/provider, response, latency, and per-provider errors. Configure at least two provider API keys for a real live comparison.

## Slide 6 — Performance and UX
Five-minute bounded in-memory cache for repeated explanations/quizzes, loading states, validation messages, retry/fallback handling, health endpoint, and machine-readable OpenAPI document.

## Slide 7 — Quality and deployment
Vitest unit/integration tests plus Supertest HTTP end-to-end coverage. Run locally with npm scripts or containerize with Docker Compose. Review `docs/DEMO.md` and `docs/OPENAPI.md` before presenting.

## Slide 8 — Limitations and next steps
Live model comparison requires provider credentials and may incur usage costs. Current cache is process-local; production scaling could use Redis, persistent metrics, and automated model evaluation datasets.
