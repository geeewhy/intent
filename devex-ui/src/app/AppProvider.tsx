//devex-ui/src/app/AppProvider.tsx
import {
  createContext, useContext, useState, ReactNode, useEffect, useSyncExternalStore
} from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/data/queryClient';
import { Toaster, toast } from '@/components/ui/sonner';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Safely access localStorage
const getLocalStorage = (key: string): string | null => {
  if (isBrowser) {
    return localStorage.getItem(key);
  }
  return null;
};

// Safely set localStorage
const setLocalStorage = (key: string, value: string): void => {
  if (isBrowser) {
    localStorage.setItem(key, value);
  }
};

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
    cb => { 
      if (isBrowser) {
        window.addEventListener('storage',cb); 
        return () => window.removeEventListener('storage',cb); 
      }
      return () => {};
    },
    () => {
      const value = getLocalStorage(key);
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
  const [flags,  setFlags]  = useState<Flags>(() => {
    const storedFlags = getLocalStorage('feature_flags');
    return storedFlags ? JSON.parse(storedFlags) : {};
  });

  const setTenant = (t:string)=>{
    setLocalStorage('tenant',t);
    if (isBrowser) {
      window.dispatchEvent(new Event('storage'));               // force same-tab update
    }
  };
  const setRole = (r:string)=>{
    setLocalStorage('role',r);
    if (isBrowser) {
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Listen for storage events from other tabs
  useEffect(() => {
    if (!isBrowser) return;

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
    setLocalStorage('feature_flags', JSON.stringify(next));
    if (isBrowser) {
      window.dispatchEvent(new Event('featureFlagsUpdated'));   // cross-tab sync
    }
  };

  return (
    <Ctx.Provider value={{ tenant, role, flags, setTenant, setRole, toggleFlag, toast }}>
      <QueryClientProvider client={queryClient}>
        <Toaster />{children}
      </QueryClientProvider>
    </Ctx.Provider>
  );
}
