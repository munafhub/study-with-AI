import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createLlm, createProviders } from './llm/index.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDatabase(config.dbPath);
const providers = createProviders(config);
const llm = providers[0];
const app = createApp({ db, config, llm, providers });

const aiModeMessage = `AI providers active: ${llm.mode} (${llm.model || 'demo'}). Configure GEMINI_API_KEY, OPENAI_API_KEY, and/or ANTHROPIC_API_KEY for live model routing/comparison.`;

let server;

/**
 * Some hosts restart the app before the previous socket is released. Retry instead of
 * crashing with EADDRINUSE so the service comes back up on its own.
 */
function listen(port, attempt = 1) {
  server = app.listen(port);
  server.on('listening', () => {
    console.log(`StudyPilot AI listening on http://localhost:${port}`);
    console.log(aiModeMessage);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt <= 15) {
      console.warn(`Port ${port} is busy, retrying in 2s (attempt ${attempt}/15)...`);
      setTimeout(() => listen(port, attempt + 1), 2000);
    } else {
      console.error(`Failed to start: ${err.message}`);
      process.exit(1);
    }
  });
}

listen(config.port);

const shutdown = () => {
  if (!server) return process.exit(0);
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
