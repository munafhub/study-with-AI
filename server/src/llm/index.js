import { createAnthropicProvider } from './anthropic.js';
import { createGeminiProvider } from './gemini.js';
import { createOpenAIProvider } from './openai.js';
import { createMockProvider } from './mock.js';

export function createProviders(config, logger = console) {
  const providers = [];
  if (config.geminiApiKey) providers.push(createGeminiProvider({ apiKey: config.geminiApiKey, model: config.geminiModel, logger }));
  if (config.openaiApiKey) providers.push(createOpenAIProvider({ apiKey: config.openaiApiKey, model: config.openaiModel, logger }));
  if (config.anthropicApiKey) providers.push(createAnthropicProvider({ apiKey: config.anthropicApiKey, model: config.anthropicModel, logger }));
  if (config.aiProvider === 'mock') return [createMockProvider()];
  if (config.aiProvider !== 'auto') {
    const selected = providers.find((p) => p.mode === config.aiProvider);
    if (!selected) throw new Error(`AI_PROVIDER=${config.aiProvider} requires the matching API key.`);
    return [selected];
  }
  return providers.length ? providers : [createMockProvider()];
}
export function createLlm(config, logger = console) { return createProviders(config, logger)[0]; }
