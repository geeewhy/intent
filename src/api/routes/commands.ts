import { Router } from 'express';
import pool from '../db';
import { stdLogger } from '../../infra/logger/stdLogger';

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
    stdLogger.error('Commands endpoint error:', { error });
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;