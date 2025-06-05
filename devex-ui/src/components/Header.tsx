
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  currentTenant: string;
  currentRole: string;
  onTenantChange: (tenant: string) => void;
  onRoleChange: (role: string) => void;
}

const tenants = ['tenant-1', 'tenant-2', 'tenant-3'];
const roles = ['admin', 'user', 'viewer'];

export const Header = ({ currentTenant, currentRole, onTenantChange, onRoleChange }: HeaderProps) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img 
          src="/lovable-uploads/b28afc6a-f1bf-4c1d-b306-a6152ab27bd4.png" 
          alt="Intent Logo" 
          className="h-8 w-8"
        />
        <span className="text-xl font-semibold text-slate-100">Intent DevX</span>
      </div>

      {/* Tenant/Role Switchers */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
              Tenant: {currentTenant}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700">
            {tenants.map((tenant) => (
              <DropdownMenuItem 
                key={tenant}
                onClick={() => onTenantChange(tenant)}
                className="text-slate-100 hover:bg-slate-700"
              >
                {tenant}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700">
              Role: {currentRole}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700">
            {roles.map((role) => (
              <DropdownMenuItem 
                key={role}
                onClick={() => onRoleChange(role)}
                className="text-slate-100 hover:bg-slate-700"
              >
                {role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System Status Indicators */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="System Healthy" />
        <div className="h-2 w-2 bg-yellow-500 rounded-full" title="2 Warnings" />
      </div>
    </header>
  );
};
