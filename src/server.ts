/**
 * Supabase server entry point
 */

import express from 'express';
import { createServer } from 'http';
import { PgEventStore } from './infra/pg/pg-event-store';
import { SupabaseServer } from './infra/supabase/supabase-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create express app
const app = express();
const port = parseInt(process.env.PORT || '3000');

// Serve static files from the public directory
app.use(express.static('public'));

// Parse JSON bodies
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

// Create Supabase server
const supabaseServer = new SupabaseServer(supabaseUrl, supabaseKey);

// Initialize database schema
async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    const eventStore = new PgEventStore();
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    process.exit(1);
  }
}

// Start the server
async function start() {
  // Initialize database schema
  await initDatabase();

  // Start the Supabase server
  await supabaseServer.start();

  // Start the HTTP server
  server.listen(port, () => {
    console.log(`HTTP server started on port ${port}`);
  });
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await supabaseServer.stop();
  process.exit(0);
});

// Start the server
start().catch((err) => {
  console.error(err);
  process.exit(1);
});
