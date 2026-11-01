import express from 'express';
import { Fields } from '../utils/validate.js';
import { asyncHandler } from '../middleware.js';
import { explainTopic, createQuiz } from '../services/aiService.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const hashKey = (type, input, mode) => `${type}:${mode}:${JSON.stringify(input).toLowerCase()}`;

export function aiRoutes(ctx) {
  const router = express.Router();
  router.get('/status', (req, res) => res.json({ mode: ctx.llm.mode, model: ctx.llm.model ?? null, providers: (ctx.providers ?? [ctx.llm]).map((p) => ({ provider: p.mode, model: p.model ?? null, live: p.mode !== 'mock' })), cacheEntries: ctx.cache?.size ?? 0 }));
  router.post('/explain', asyncHandler(async (req, res) => {
    const f = new Fields(req.body); const topic = f.str('topic', { min: 2, max: 200, label: 'Topic' }); const level = f.oneOf('level', LEVELS, { optional: true, label: 'Level' }) ?? 'intermediate'; f.done();
    const input = { topic, level }; const key = hashKey('explain', input, ctx.llm.mode); const cached = ctx.cache?.get(key);
    if (cached) return res.set('X-Cache', 'HIT').json({ ...cached, cached: true });
    const result = await explainTopic(ctx, input); ctx.cache?.set(key, result); res.set('X-Cache', 'MISS').json({ ...result, cached: false });
  }));
  router.post('/quiz', asyncHandler(async (req, res) => {
    const f = new Fields(req.body); const topic = f.str('topic', { min: 2, max: 200, label: 'Topic' }); const count = f.int('count', { min: 1, max: 10, optional: true, label: 'Number of questions' }) ?? 5; const difficulty = f.oneOf('difficulty', LEVELS, { optional: true, label: 'Difficulty' }) ?? 'intermediate'; f.done();
    const input = { topic, count, difficulty }; const key = hashKey('quiz', input, ctx.llm.mode); const cached = ctx.cache?.get(key);
    if (cached) return res.set('X-Cache', 'HIT').json({ ...cached, cached: true });
    const result = await createQuiz(ctx, input); ctx.cache?.set(key, result); res.set('X-Cache', 'MISS').json({ ...result, cached: false });
  }));
  router.post('/compare', asyncHandler(async (req, res) => {
    const f = new Fields(req.body); const topic = f.str('topic', { min: 2, max: 200, label: 'Topic' }); const level = f.oneOf('level', LEVELS, { optional: true, label: 'Level' }) ?? 'intermediate'; f.done();
    const providers = ctx.providers ?? [ctx.llm];
    const results = await Promise.all(providers.map(async (provider) => {
      const started = Date.now();
      try { const value = await explainTopic({ ...ctx, llm: provider }, { topic, level }); return { provider: provider.mode, model: provider.model ?? null, ok: true, durationMs: Date.now() - started, result: value }; }
      catch (error) { return { provider: provider.mode, model: provider.model ?? null, ok: false, durationMs: Date.now() - started, error: { code: error.code ?? 'AI_ERROR', message: error.message ?? 'Provider failed.' } }; }
    }));
    res.json({ topic, level, comparisonCount: results.length, liveProviderCount: results.filter((r) => r.ok && r.provider !== 'mock').length, results });
  }));
  return router;
}
