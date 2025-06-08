//devex-ui/src/hooks/api/useLogs.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLogs } from '@/data';
import { createLogStream } from '@/mocks/stores/log.store';
import type { LogLine } from '@/mocks/factories/log.factory';
import React from 'react';
import { logsKeys } from './queryKeys';

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
  });

  // live updates → merge into cache
  React.useEffect(() => {
    if (!enabled || paused) return;

    let isActive = true;
    const currentTenant = stableTenant.current;
    const currentQueryKey = logsKeys.list(currentTenant, limit);

    const unsub = createLogStream(currentTenant).subscribe((log: LogLine) => {
      // Only update if the component is still mounted and tenant hasn't changed
      if (isActive && currentTenant === stableTenant.current) {
        qc.setQueryData<LogLine[]>(currentQueryKey, old => {
          const next = old ? [log, ...old] : [log];
          return next.slice(0, limit);
        });
      }
    });

    return () => {
      isActive = false;
      unsub?.();
    };
  }, [limit, qc, enabled, paused]);

  return query;
}
