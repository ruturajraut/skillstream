// server/src/index.js
import app from './app.js';
import env from './config/env.js';
import { initDatabases } from './config/db.js';

const PORT = env.port;

// Connect to databases, then start server
async function start() {
  await initDatabases();
  app.listen(PORT, () => {
    console.log(`✅ Server running in ${env.nodeEnv} mode on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});