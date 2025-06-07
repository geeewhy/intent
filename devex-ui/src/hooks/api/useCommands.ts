import { useQuery } from '@tanstack/react-query';
import { fetchCommands } from '@/data';
import { commandsKeys } from './queryKeys';

export function useCommands(tenant: string, limit = 50) {
  return useQuery({
    queryKey: commandsKeys.list(tenant, limit),
    queryFn: () => fetchCommands(tenant, limit),
  });
}
