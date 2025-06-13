import { Router } from 'express';
import pool from '../db';

const router = Router();

router.get('/api/events', async (req, res) => {
  const tenantId = req.query.tenant_id as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT *, created_at AS "timestamp" FROM infra.events 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [tenantId, limit]
    );

    res.json(result.rows);
  } finally {
    client.release();
  }
});

router.get('/api/events/stream', async (req, res) => {
  const tenantId = req.query.tenant_id as string;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = await pool.connect();
  const channel = `events:${tenantId}`;

  await client.query(`LISTEN "${channel}"`);

  const onNotify = (msg: { payload: string }) => {
    try {
      const event = JSON.parse(msg.payload);
      console.log("Normalized", event);
      const normalized = {
        ...event,
        status: 'processed'
      };
      res.write(`data: ${JSON.stringify(normalized)}\n\n`);
    } catch (error) {
      // If parsing fails, send the original payload
      res.write(`data: ${msg.payload}\n\n`);
    }
  };

  client.on('notification', onNotify);

  req.on('close', async () => {
    client.removeListener('notification', onNotify);
    await client.query(`UNLISTEN "${channel}"`);
    client.release();
    res.end();
  });
});

export default router;
