import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/api';
import { initDatabaseSchema } from './server/db';
import { seedDatabaseIfEmpty } from './server/seed';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize MySQL Database Schema & Seed Data
  try {
    await initDatabaseSchema();
    await seedDatabaseIfEmpty();
    console.log('MySQL Database initialization and seed check completed.');
  } catch (err: any) {
    console.error('MySQL initialization warning:', err.message);
  }

  // Mount API routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development vs static production serving
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Property ERP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
