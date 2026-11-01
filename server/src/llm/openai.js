import { HttpError } from '../errors.js';

/** OpenAI Chat Completions adapter mapped to StudyPilot's tool-call interface. */
export function createOpenAIProvider({ apiKey, model = 'gpt-4o-mini', fetchImpl = globalThis.fetch, timeoutMs = 45000, logger = console }) {
  return {
    mode: 'openai', model,
    async complete({ system, messages = [], tools, toolChoice, maxTokens = 1500 }) {
      const mapped = messages.map((m) => {
        if (typeof m.content === 'string') return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
        const blocks = Array.isArray(m.content) ? m.content : [];
        if (m.role === 'assistant') {
          const calls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
          return calls.length ? { role: 'assistant', content: null, tool_calls: calls } : { role: 'assistant', content: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n') };
        }
        const results = blocks.filter((b) => b.type === 'tool_result').map((b) => ({ role: 'tool', tool_call_id: b.tool_use_id, content: String(b.content ?? '') }));
        return results.length ? results : { role: 'user', content: blocks.map((b) => b.text || '').join('\n') };
      }).flat();
      const body = { model, messages: [{ role: 'system', content: system || 'You are a helpful study assistant.' }, ...mapped], max_tokens: maxTokens, temperature: 0.3 };
      if (tools?.length) {
        body.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema, strict: false } }));
        body.tool_choice = toolChoice?.type === 'tool' ? { type: 'function', function: { name: toolChoice.name } } : 'auto';
      }
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      try { res = await fetchImpl('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }); }
      catch (err) { throw new HttpError(503, 'AI_UNAVAILABLE', err?.name === 'AbortError' ? 'The AI service took too long to respond.' : 'The AI service could not be reached.'); }
      finally { clearTimeout(timer); }
      if (!res.ok) { logger.error?.(`OpenAI API returned HTTP ${res.status}`); throw new HttpError(503, res.status === 429 ? 'AI_BUSY' : 'AI_UNAVAILABLE', res.status === 429 ? 'The AI service is busy or its usage limit was reached.' : 'The OpenAI service is unavailable. Check the API key, model, and API access.'); }
      const data = await res.json(); const msg = data.choices?.[0]?.message ?? {}; const content = [];
      if (msg.content) content.push({ type: 'text', text: msg.content });
      for (const call of msg.tool_calls ?? []) { let input = {}; try { input = JSON.parse(call.function.arguments || '{}'); } catch {} content.push({ type: 'tool_use', id: call.id, name: call.function.name, input }); }
      return { content, stopReason: data.choices?.[0]?.finish_reason ?? 'stop' };
    },
  };
}
