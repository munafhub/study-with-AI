import { HttpError } from '../errors.js';

/**
 * Tried in order when the configured model is retired (HTTP 404) or overloaded (HTTP 503).
 * Google retires models regularly (e.g. gemini-2.5-flash is gone for new keys), so a stale
 * GEMINI_MODEL must not be able to break every AI feature.
 */
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

/** Gemini REST adapter that preserves the app's existing tool-call interface. */
export function createGeminiProvider({ apiKey, model, fetchImpl = globalThis.fetch, timeoutMs = 45000, logger = console }) {
  const toolNamesById = new Map();

  function toGeminiContents(messages = []) {
    const contents = [];
    for (const message of messages) {
      const role = message.role === 'assistant' ? 'model' : 'user';
      const value = message.content;
      if (typeof value === 'string') {
        contents.push({ role, parts: [{ text: value }] });
        continue;
      }
      if (!Array.isArray(value)) continue;
      if (role === 'model') {
        const parts = value.flatMap((block) => {
          if (block.type === 'text') return [{ text: block.text }];
          if (block.type === 'tool_use') {
            toolNamesById.set(block.id, block.name);
            return [{ functionCall: { name: block.name, args: block.input ?? {} } }];
          }
          return [];
        });
        if (parts.length) contents.push({ role: 'model', parts });
      } else {
        const parts = value.flatMap((block) => {
          if (block.type === 'tool_result') {
            const name = toolNamesById.get(block.tool_use_id) || 'unknown_tool';
            let response = block.content;
            try { response = JSON.parse(block.content); } catch {}
            return [{ functionResponse: { name, response: { result: response, isError: Boolean(block.is_error) } } }];
          }
          if (block.type === 'text') return [{ text: block.text }];
          return [];
        });
        if (parts.length) contents.push({ role: 'user', parts });
      }
    }
    return contents;
  }

  return {
    mode: 'gemini',
    model,
    async complete({ system, messages, tools, toolChoice, maxTokens = 1500 }) {
      const body = {
        systemInstruction: { parts: [{ text: system || 'You are a helpful study assistant.' }] },
        contents: toGeminiContents(messages),
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
      };
      if (tools?.length) {
        body.tools = [{ functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        })) }];
        const mode = toolChoice?.type === 'tool' ? 'ANY' : toolChoice?.type === 'auto' ? 'AUTO' : 'AUTO';
        body.toolConfig = { functionCallingConfig: {
          mode,
          ...(toolChoice?.type === 'tool' && toolChoice.name ? { allowedFunctionNames: [toolChoice.name] } : {}),
        } };
      }

      // Try the configured model first, then known-good fallbacks.
      const candidates = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
      let data;
      for (let attempt = 0; attempt < candidates.length; attempt += 1) {
        const candidate = candidates[attempt];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), attempt === 0 ? timeoutMs : Math.min(timeoutMs, 20000));
        let response;
        try {
          response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } catch (err) {
          throw new HttpError(503, 'AI_UNAVAILABLE', err?.name === 'AbortError' ? 'The AI service took too long to respond.' : 'The AI service could not be reached.');
        } finally { clearTimeout(timer); }

        if (response.ok) {
          data = await response.json();
          break;
        }

        logger.error?.(`Gemini API returned HTTP ${response.status} for ${candidate}`);
        // Retired (404), overloaded (503) or rate-limited (429) models are worth retrying with
        // another model name: free-tier quotas are tracked per model, so one model can be
        // exhausted while another still answers.
        if ((response.status === 404 || response.status === 503 || response.status === 429) && attempt < candidates.length - 1) {
          logger.warn?.(`Gemini model "${candidate}" unusable (HTTP ${response.status}); trying "${candidates[attempt + 1]}".`);
          continue;
        }
        if (response.status === 429) throw new HttpError(503, 'AI_BUSY', 'The AI service is busy or its usage limit was reached. Please try again later.');
        if (response.status === 404) throw new HttpError(503, 'AI_MODEL_NOT_FOUND', `The Gemini model "${candidate}" is not available to this API key (HTTP 404). Set GEMINI_MODEL to a model your key can access.`);
        if (response.status === 503) throw new HttpError(503, 'AI_BUSY', `The Gemini model "${candidate}" is temporarily overloaded (HTTP 503). Please try again in a moment.`);
        throw new HttpError(503, 'AI_UNAVAILABLE', `The Gemini request failed (HTTP ${response.status}). Check the API key, model, and API access.`);
      }
      if (!data) throw new HttpError(503, 'AI_UNAVAILABLE', 'The Gemini AI service is unavailable. Check the API key, model, and API access.');

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const content = [];
      for (const part of parts) {
        if (part.text) content.push({ type: 'text', text: part.text });
        if (part.functionCall) {
          const id = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          toolNamesById.set(id, part.functionCall.name);
          content.push({ type: 'tool_use', id, name: part.functionCall.name, input: part.functionCall.args ?? {} });
        }
      }
      return { content, stopReason: data.candidates?.[0]?.finishReason ?? 'STOP' };
    },
  };
}
