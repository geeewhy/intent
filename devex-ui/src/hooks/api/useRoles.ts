//devex-ui/src/hooks/api/useRoles.ts
import { useQuery } from '@tanstack/react-query';
import { isMock } from '@/config/apiMode';
import { fetchRolesByDomain } from '@/data';
import { rolesStore } from '@/mocks/stores/roles.store';
import { rolesKeys } from './queryKeys';

export function useRoles(domain: string) {
  return useQuery({
    queryKey: rolesKeys.list(domain),
    queryFn: async () => {
      if (isMock) {
        const match = rolesStore.list().find(r => r.domain === domain);
        return match?.roles ?? [];
      }
      return fetchRolesByDomain(domain);
    },
    enabled: !!domain
  });
}