# Upgrade checklist

| Requirement | Implementation | Notes |
|---|---|---|
| Secondary AI feature | Existing multi-step AI planner + syllabus PDF extraction + explanations/quizzes | Planner already uses a tool-driven multi-step workflow with a deterministic fallback. |
| Multi-model routing | Gemini, OpenAI, Anthropic adapters with `AI_PROVIDER=auto` | Each configured key activates its provider; configure two keys for two live providers. |
| Live model comparison | `POST /api/ai/compare` and Learn-page comparison panel | Sends the same topic/level to each configured provider; displays response, latency, and errors. |
| Output validation | Existing schema validators and one retry; provider errors are isolated in comparisons | Invalid output is not blindly accepted. Existing plan and syllabus fallbacks remain. |
| UX polish | Loading labels, errors, empty validation, comparison status/results | Existing UI loading/error states retained and comparison added. |
| AI-generated docs | OpenAPI JSON endpoint and usage guide | `GET /api/openapi.json`, `docs/OPENAPI.md`. |
| Performance | Bounded five-minute in-memory cache for explanations/quizzes | `X-Cache` response header; cache resets on restart. |
| Comprehensive tests | Existing unit/integration tests plus `upgrade.test.js` HTTP E2E checks | Test execution could not be verified in this build environment because dependency installation timed out. Run `npm ci`, then `npm test` and `npm run test:coverage`. |
| Deployment | Dockerfile and Docker Compose | Build/run locally with Docker; a hosted deployment still requires a host and provider credentials. |
| Draft presentation | `docs/PRESENTATION_OUTLINE.md` | Eight-slide mentor presentation outline. |

**Important:** A code change cannot activate paid/remote model providers without their API credentials. Offline mock mode is for demonstration only and is explicitly not counted as a live LLM provider.
