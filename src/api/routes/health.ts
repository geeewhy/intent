import { Router } from 'express';
import { testConnection } from '../db';
import { stdLogger } from '../../infra/logger/stdLogger';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    stdLogger.error('Health check error:', { error });
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;