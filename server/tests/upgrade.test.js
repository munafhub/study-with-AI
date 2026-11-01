import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, signUp, authed } from './helpers/setup.js';
import { createResponseCache } from '../src/services/responseCache.js';
import { createProviders } from '../src/llm/index.js';
import { loadConfig } from '../src/config.js';

describe('upgrade features', () => {
  it('serves an OpenAPI specification and health endpoint end-to-end', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/api/health')).body.ok).toBe(true);
    const spec = await request(app).get('/api/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(spec.body.paths['/api/ai/compare']).toBeTruthy();
  });
  it('caches cloned values with TTL and bounded storage', () => {
    let time = 0;
    const cache = createResponseCache({ ttlMs: 10, maxEntries: 1, now: () => time });
    cache.set('a', { nested: { value: 1 } });
    const first = cache.get('a'); first.nested.value = 9;
    expect(cache.get('a').nested.value).toBe(1);
    cache.set('b', 2); expect(cache.get('a')).toBeUndefined();
    time = 20; expect(cache.get('b')).toBeUndefined();
  });
  it('supports selecting configured providers and offline fallback', () => {
    expect(createProviders(loadConfig({})).map((p) => p.mode)).toEqual(['mock']);
    expect(createProviders(loadConfig({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' })).map((p) => p.mode)).toEqual(['gemini', 'openai']);
  });
  it('runs the same query through two configured providers end-to-end', async () => {
    const base = (await import('../src/llm/mock.js')).createMockProvider();
    const first = { ...base, mode: 'gemini', model: 'test-gemini' };
    const second = { ...base, mode: 'openai', model: 'test-openai' };
    const { app } = makeApp({ llm: first, providers: [first, second] });
    const api = authed(app, (await signUp(app)).token);
    const response = await api.post('/api/ai/compare', { topic: 'Photosynthesis', level: 'beginner' });
    expect(response.status).toBe(200);
    expect(response.body.comparisonCount).toBe(2);
    expect(response.body.results.map((r) => r.provider)).toEqual(['gemini', 'openai']);
    expect(response.body.results.every((r) => r.ok)).toBe(true);
    expect(response.body.results[0].result.explanation).toContain('Photosynthesis');
  });
});
