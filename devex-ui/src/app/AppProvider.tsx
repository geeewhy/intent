import {
  createContext, useContext, useState, ReactNode, useEffect, useSyncExternalStore
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

const useLocalSetting = <T,>(key:string, fallback:T)=>{
  return useSyncExternalStore(
    cb => { window.addEventListener('storage',cb); return ()=>window.removeEventListener('storage',cb); },
    () => {
      const value = localStorage.getItem(key);
      if (value === null) return fallback;
      try {
        return JSON.parse(value);
      } catch (e) {
        // If parsing fails, return the raw string value
        return value as unknown as T;
      }
    },
    () => fallback
  );
};

export function AppProvider({ children }: { children: ReactNode }) {
  const tenant = useLocalSetting('tenant','tenant-1');
  const role   = useLocalSetting('role','admin');
  const [flags,  setFlags]  = useState<Flags>(
    JSON.parse(localStorage.getItem('feature_flags') || '{}'),
  );

  const setTenant = (t:string)=>{
    localStorage.setItem('tenant',t);
    window.dispatchEvent(new Event('storage'));               // force same-tab update
  };
  const setRole = (r:string)=>{
    localStorage.setItem('role',r);
    window.dispatchEvent(new Event('storage'));
  };

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags' && e.newValue) {
        setFlags(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleFlag = (id: string, v: boolean = !flags[id]) => {
    const next = { ...flags, [id]: v };
    setFlags(next);
    localStorage.setItem('feature_flags', JSON.stringify(next));
    window.dispatchEvent(new Event('featureFlagsUpdated'));   // cross-tab sync
  };

  return (
    <Ctx.Provider value={{ tenant, role, flags, setTenant, setRole, toggleFlag, toast }}>
      <QueryClientProvider client={queryClient}>
        <Toaster />{children}
      </QueryClientProvider>
    </Ctx.Provider>
  );
}
