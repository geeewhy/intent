//devex-ui/src/hooks/api/useLogs.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLogs } from '@/data';
import { createLogStream } from '@/mocks/stores/log.store';
import type { LogLine } from '@/mocks/factories/log.factory';
import React from 'react';
import { logsKeys } from './queryKeys';
import { isMock } from '@/config/apiMode';

export function useLogs(tenant: string, limit = 100, options = { enabled: true, paused: false }) {
  const qc = useQueryClient();
  const { enabled = true, paused = false } = options;

  // Use useRef to store a stable reference to the tenant
  const stableTenant = React.useRef(tenant);

  // Update the ref when tenant changes
  React.useEffect(() => {
    stableTenant.current = tenant;
  }, [tenant]);

  // Get the query key for this tenant and limit
  const queryKey = logsKeys.list(tenant, limit);

  // initial fetch + caching
  const query = useQuery({
    queryKey,
    queryFn: () => fetchLogs(tenant, limit),
    enabled: isMock // only run fetch if mock mode is active
  });

  // live updates → merge into cache
  React.useEffect(() => {
    if (!enabled || paused) return;

    const currentTenant = stableTenant.current;
    const currentQueryKey = logsKeys.list(currentTenant, limit);

    if (isMock) {
      const unsub = createLogStream(currentTenant).subscribe((log) => {
        qc.setQueryData<LogLine[]>(currentQueryKey, old => [log, ...(old || [])].slice(0, limit));
      });
      return () => unsub?.();
    }

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3009'}/api/logs/stream?tenant_id=${currentTenant}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        qc.setQueryData<LogLine[]>(currentQueryKey, old => [log, ...(old || [])].slice(0, limit));
      } catch {}
    };

    return () => es.close();
  }, [limit, qc, enabled, paused]);

  return query;
}
