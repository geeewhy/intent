import { useEffect, useState } from 'react';
import { createLogStream, type LogLine, fetchLogs } from '@/data';

export function useLogsStream(tenant: string, limit = 100) {
  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    fetchLogs(tenant, limit).then(setLogs).catch(console.error);
    const stream = createLogStream(tenant);
    const unsub = stream.subscribe(l => setLogs(prev => [l, ...prev].slice(0, limit)));
    return unsub;
  }, [tenant, limit]);

  return logs;
}
