export const openApiSpec = {
  openapi: '3.1.0',
  info: { title: 'StudyPilot AI API', version: '2.0.0', description: 'Study planning, syllabus extraction, topic explanations, quizzes, and multi-model comparison.' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }, schemas: { Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } }, required: ['code', 'message'] } } } } },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': { get: { security: [], summary: 'Health check', responses: { '200': { description: 'Service is healthy' } } } },
    '/api/ai/status': { get: { summary: 'Active AI providers', responses: { '200': { description: 'Provider configuration' } } } },
    '/api/ai/explain': { post: { summary: 'Explain a topic', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string', minLength: 2, maxLength: 200 }, level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } } } } } }, responses: { '200': { description: 'Validated explanation' }, '400': { description: 'Invalid input' }, '502': { description: 'AI output validation failed' } } } },
    '/api/ai/quiz': { post: { summary: 'Generate a multiple-choice quiz', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 10 }, difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } } } } } }, responses: { '200': { description: 'Validated quiz' } } } },
    '/api/ai/compare': { post: { summary: 'Compare the same topic across configured AI providers', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string', minLength: 2, maxLength: 200 }, level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } } } } } }, responses: { '200': { description: 'Per-provider results and timings' } } } },
  },
};
