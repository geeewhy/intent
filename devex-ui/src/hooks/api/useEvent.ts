import { useQuery } from '@tanstack/react-query';
import { fetchEvent } from '@/data';
import { eventsKeys } from './queryKeys';

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => fetchEvent(eventId),
  });
}
