import {
  createContext, useContext, useState, ReactNode, useEffect,
} from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/data/queryClient';
import { Toaster, toast } from '@/components/ui/sonner';

type Flags = Record<string, boolean>;

interface Ctx {
  tenant: string; setTenant(t: string): void;
  role:   string; setRole(r: string): void;
  flags:  Flags;  toggleFlag(id: string, v?: boolean): void;
  toast:  typeof toast;
}

const Ctx = createContext<Ctx | null>(null);
export const useAppCtx = () => useContext(Ctx)!;

export function AppProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState(localStorage.getItem('tenant') || 'tenant-1');
  const [role,   setRole]   = useState(localStorage.getItem('role')   || 'admin');
  const [flags,  setFlags]  = useState<Flags>(
    JSON.parse(localStorage.getItem('feature_flags') || '{}'),
  );

  useEffect(() => { localStorage.setItem('tenant', tenant); }, [tenant]);
  useEffect(() => { localStorage.setItem('role', role);     }, [role]);

  const toggleFlag = (id: string, v: boolean = !flags[id]) => {
    const next = { ...flags, [id]: v };
    setFlags(next);
    localStorage.setItem('feature_flags', JSON.stringify(next));
    window.dispatchEvent(new Event('featureFlagsUpdated'));   // cross-tab sync
  };

  return (
    <Ctx.Provider value={{ tenant, role, flags, setTenant, setRole, toggleFlag, toast }}>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        {children}
      </QueryClientProvider>
    </Ctx.Provider>
  );
}