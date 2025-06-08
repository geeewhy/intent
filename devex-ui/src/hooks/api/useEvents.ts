//devex-ui/src/hooks/api/useEvents.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvents } from '@/data';
import type { Event } from '@/data';
import React from 'react';
import { eventsKeys } from './queryKeys';
import { useEventStream } from '@/hooks/ws/useEventStream';

export function useEvents(tenant: string, limit = 50, options = { enabled: true }) {
  const qc = useQueryClient();
  const { enabled = true } = options;

  // Use useRef to store a stable reference to the tenant
  const stableTenant = React.useRef(tenant);

  // Update the ref when tenant changes
  React.useEffect(() => {
    stableTenant.current = tenant;
  }, [tenant]);

  // Get the query key for this tenant and limit
  const queryKey = eventsKeys.list(tenant, limit);

  // initial fetch + caching
  const query = useQuery({
    queryKey,
    queryFn: () => fetchEvents(tenant, limit),
  });

  // live updates → merge into cache
  useEventStream<Event>(tenant, (evt) => {
    if (!enabled) return;
    qc.setQueryData<Event[]>(
      eventsKeys.list(tenant, limit),
      (old) => [evt, ...(old || [])].slice(0, limit),
    );
  });

  return query;
}
