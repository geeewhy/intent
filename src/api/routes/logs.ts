import { Router } from 'express';
import { subscribeToLogs } from '../../infra/logger/logBroadcaster';

const router = Router();

router.get('/api/logs/stream', (req, res) => {
  const tenantId = req.query.tenant_id as string;
  const maxLogsPerClient = parseInt(req.query.max_logs as string) || 1000; // Default to 1000 logs per client

  let logCount = 0;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send a heartbeat every 30 seconds to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30_000);

  const unsub = subscribeToLogs((log) => {
    if (logCount >= maxLogsPerClient) {
      // If we've reached the maximum number of logs, unsubscribe and end the connection
      clearInterval(heartbeatInterval);
      unsub();
      res.end();
      return;
    }

    if (!tenantId || !log.tenant_id || log.tenant_id === tenantId) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
      logCount++;
    }
  });

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsub();
    res.end();
  });
});

export default router;
