//devex-ui/src/hooks/api/useEvents.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvents, createEventStream } from '@/data';
import type { Event } from '@/data';
import React from 'react';
import { eventsKeys } from './queryKeys';

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
  React.useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    const currentTenant = stableTenant.current;
    const currentQueryKey = eventsKeys.list(currentTenant, limit);

    const unsub = createEventStream(currentTenant).subscribe((event: Event) => {
      // Only update if the component is still mounted and tenant hasn't changed
      if (isActive && currentTenant === stableTenant.current) {
        qc.setQueryData<Event[]>(currentQueryKey, old => {
          const next = old ? [event, ...old] : [event];
          return next.slice(0, limit);
        });
      }
    });

    return () => {
      isActive = false;
      unsub?.();
    };
  }, [limit, qc, enabled]);

  return query;
}
