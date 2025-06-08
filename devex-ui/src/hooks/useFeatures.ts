import { useAppCtx } from '@/app/AppProvider';
export function useFeatures() {
  const { flags, toggleFlag } = useAppCtx();
  return {
    enabled: (id: string) => !!flags[id],
    toggle:  toggleFlag,
    all: flags,
  };
}