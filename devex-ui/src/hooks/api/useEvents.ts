//devex-ui/src/hooks/api/useEvents.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvents } from '@/data/apiService';
import type { Event } from '@/data/types';
import { eventsKeys } from './queryKeys';
import { useEventStream } from '@/hooks/ws/useEventStream';

export function useEvents(tenant: string, limit = 50, options = { enabled: true }) {
  const qc = useQueryClient();

  const queryKey = eventsKeys.list(tenant, limit);

  // 1. Fetch initial history
  const query = useQuery({
    queryKey,
    queryFn: () => fetchEvents(tenant, limit),
    enabled: options.enabled
  });

  // 2. Stream new events
  useEventStream<Event>(tenant, (newEvent) => {
    qc.setQueryData<Event[]>(queryKey, (prev = []) => {
      const seen = prev.some(ev => ev.id === newEvent.id);
      return seen ? prev : [newEvent, ...prev].slice(0, limit);
    });
  });

  return query;
}
