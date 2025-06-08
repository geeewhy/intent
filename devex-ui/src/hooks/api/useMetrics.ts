//devex-ui/src/hooks/api/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/data/api';

export const useMetrics = () =>
  useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiClient.get('/api/metrics'),
    refetchInterval: 10000 // Gentle refresh every 10 seconds
  });
