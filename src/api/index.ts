// src/api/index.ts
import express from 'express';
import cors from 'cors';
import { registerRegistryRoutes } from './registry';

const app = express();
const PORT = process.env.ADMIN_API_PORT || 3009;

// Allow CORS from localhost origins
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

registerRegistryRoutes(app);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Admin API server running at http://localhost:${PORT}`);
  console.log(`Registry available at http://localhost:${PORT}/api/registry`);
});

export default app;
