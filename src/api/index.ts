// src/api/index.ts
import express from 'express';
import cors from 'cors';
import pool, { testConnection } from './db';
import { stdLogger } from '../infra/logger/stdLogger';
import { registerRoutes } from './routes';

const app = express();
const PORT = process.env.ADMIN_API_PORT || 3009;

// Allow CORS from any localhost origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // Allow any localhost or 127.0.0.1 origin regardless of port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Register all routes
registerRoutes(app);

// Initialize database connection
const initDb = async () => {
  try {
    const result = await testConnection();
    if (result.connected) {
      stdLogger.info(`Database connection established: ${result.timestamp}`);
    } else {
      stdLogger.error(`Failed to connect to database: ${result.error}`);
    }
  } catch (error) {
    stdLogger.error('Database initialization error:', { error });
  }
};

// Start the server
const server = app.listen(PORT, async () => {
  stdLogger.info(`Admin API server running at http://localhost:${PORT}`);
  stdLogger.info(`Registry available at http://localhost:${PORT}/api/registry`);

  // Initialize database connection after server starts
  await initDb();
});

// Implement graceful shutdown
const gracefulShutdown = async (signal: string) => {
  stdLogger.info(`${signal} received. Starting graceful shutdown...`);

  // Close the server first to stop accepting new connections
  server.close(() => {
    stdLogger.info('HTTP server closed');

    // Then close the database pool
    pool.end().then(() => {
      stdLogger.info('Database connections closed');
      process.exit(0);
    }).catch(err => {
      stdLogger.error('Error closing database connections:', { error: err });
      process.exit(1);
    });
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    stdLogger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
