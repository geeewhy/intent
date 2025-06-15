//devex-ui/src/components/Header.tsx
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppCtx } from '@/app/AppProvider';
import { isMock, apiMode } from '@/config/apiMode';
import { Logo } from './Logo';

let tenants = ['0af03580-98d5-4884-96e4-e75168d8b887'];

if (isMock) {
    tenants = ['tenant-1','tenant-2','tenant-empty'];
}

export const Header = () => {
  const { tenant, setTenant } = useAppCtx();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Logo />
        <span className="text-xl font-semibold text-slate-100">Intent DevX</span>
      </div>

      {/* Tenant switcher */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="hover:text-slate-100">
            <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
              Tenant: {tenant}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700">
            {tenants.map((tenant) => (
              <DropdownMenuItem 
                key={tenant}
                onClick={() => setTenant(tenant)}
                className="text-slate-100 hover:bg-slate-700"
              >
                {tenant}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* API type indicators */}

      <div className="flex items-center gap-2">
          {!isMock && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Real API" />}
          {isMock && <div className="h-2 w-2 bg-yellow-500 rounded-full" title="Mocked API" />}
      </div>
    </header>
  );
};
