//devex-ui/src/hooks/api/useSubmitCommand.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitCommand } from '@/data';
import { commandsKeys } from './queryKeys';

export function useSubmitCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitCommand,
    onSuccess: () => {
      // Invalidate all commands queries
      qc.invalidateQueries({ queryKey: commandsKeys.all, exact: false });
    },
  });
}
