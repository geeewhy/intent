//src/api/index.ts
import express from 'express';
import { registerRegistryRoutes } from './registry';

// Create Express application
const app = express();
const PORT = process.env.ADMIN_API_PORT || 3009;

// Middleware for parsing JSON
app.use(express.json());

// Register registry routes
registerRegistryRoutes(app);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Admin API server running at http://localhost:${PORT}`);
  console.log(`Registry available at http://localhost:${PORT}/api/registry`);
});

export default app;