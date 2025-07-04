import { Router } from 'express';
import pool from '../db';
import { Scheduler } from '../../infra/temporal/scheduler';
import logger from '../logger';

const router = Router();

router.get('/api/commands', async (req, res) => {
  try {
    // Get query parameters
    const tenantId = req.query.tenant_id as string;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 1000) : 10;

    // Validate tenant_id
    if (!tenantId) {
      return res.status(400).json({
        error: 'tenant_id is required'
      });
    }

    const client = await pool.connect();

    try {
      // Query commands from database
      const result = await client.query(
        `SELECT *,created_at as "createdAt", "result" as "response" FROM infra.commands 
         WHERE tenant_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [tenantId, limit]
      );

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Commands endpoint error:', { error });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST endpoint for submitting commands
router.post('/api/commands', async (req, res) => {
  try {
    const command = req.body;

    logger?.info('Received command submission', {
      operation: 'routes/commands.ts:postCommand',
      commandType: command?.type,
      tenantId: command?.tenant_id
    });

    // Basic validation
    if (!command || !command.type || !command.tenant_id || !command.payload) {
      logger?.warn('Invalid command format', {
        operation: 'routes/commands.ts:postCommand',
        commandType: command?.type,
        tenantId: command?.tenant_id,
        missingFields: [
          !command ? 'command' : null,
          command && !command.type ? 'type' : null,
          command && !command.tenant_id ? 'tenant_id' : null,
          command && !command.payload ? 'payload' : null
        ].filter(Boolean)
      });

      return res.status(400).json({
        status: 'fail',
        error: 'Invalid command format. Required fields: type, tenant_id, payload'
      });
    }

    // Ensure command has an ID
    if (!command.id) {
      command.id = require('crypto').randomUUID();
    }

    // Set initial status to pending if not provided
    if (!command.status) {
      command.status = 'pending';
    }

    // Create scheduler instance
    const scheduler = await Scheduler.create();

    try {
      // Schedule the command
      console.log(command);
      const schedulerResponse = await scheduler.schedule(command);

      // Log success
      logger?.info('Command scheduled successfully', {
        operation: 'routes/commands.ts:postCommand',
        commandId: command.id,
        commandType: command.type,
        tenantId: command.tenant_id
      });

      if (schedulerResponse.status === 'fail') {
        //res.status(422);
      }
      else {
        res.status(200);
      }
      res.json(schedulerResponse);
    } catch (error) {
      // Log error
      logger?.error('Failed to schedule command', {
        operation: 'routes/commands.ts:postCommand',
        commandId: command.id,
        commandType: command.type,
        tenantId: command.tenant_id,
        error
      });

      // Return error response
      res.status(500).json({
        status: 'fail',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      // Close the scheduler
      await scheduler.close();
    }
  } catch (error) {
    logger?.error('Command submission error:', {
      operation: 'routes/commands.ts:postCommand',
      error 
    });
    res.status(500).json({
      status: 'fail',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
