import { Router } from 'express';
import pool, {testConnection} from '../db';
import { stdLogger } from '../../infra/logger/stdLogger';

const router = Router();

router.get('/api/metrics', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get total number of rows in infra.commands
      const commandsResult = await client.query('SELECT COUNT(*) FROM infra.commands');
      const commands = parseInt(commandsResult.rows[0].count);
      
      // Get total number of rows in infra.events
      const eventsResult = await client.query('SELECT COUNT(*) FROM infra.events');
      const events = parseInt(eventsResult.rows[0].count);
      const totalEvents = events; // Same as events
      
      // Get total number of rows in infra.aggregates
      const aggregatesResult = await client.query('SELECT COUNT(*) FROM infra.aggregates');
      const aggregates = parseInt(aggregatesResult.rows[0].count);
      
      // Calculate traces (commands + events)
      const traces = commands + events;
      
      // Get total projections (all rows in all tables in public schema)
      const projectionsResult = await client.query(`
        SELECT SUM(n_live_tup) as total
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `);
      const projections = parseInt(projectionsResult.rows[0].total) || 0;
      
      const health = await testConnection() && 1;
      
      res.json({
        commands,
        events,
        totalEvents,
        traces,
        aggregates,
        projections,
        health
      });
    } finally {
      client.release();
    }
  } catch (error) {
    stdLogger.error('Metrics endpoint error:', { error });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;