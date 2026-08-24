import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] SFB API running on port ${env.port} (${env.nodeEnv})`);
    console.log(`[server] Base URL: http://localhost:${env.port}/api/${env.apiVersion}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });
}

start();
