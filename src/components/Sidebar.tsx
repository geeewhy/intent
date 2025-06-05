
import { useState } from "react";
import { 
  Terminal, 
  Activity, 
  Database, 
  GitBranch, 
  Package, 
  AlertTriangle,
  Bot,
  Settings,
  Rewind,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hideTooltip: true }, // Dashboard with label but no tooltip
  { id: 'commands', label: 'Command Issuer', icon: Terminal },
  { id: 'events', label: 'Event Stream', icon: Activity },
  { id: 'projections', label: 'Projections', icon: Database },
  { id: 'traces', label: 'Trace Viewer', icon: GitBranch },
  { id: 'aggregates', label: 'Aggregates', icon: Package },
  { id: 'rewind', label: 'Projection Rewind', icon: Rewind },
  { id: 'status', label: 'System Status', icon: AlertTriangle },
  { id: 'ai', label: 'AI Companion', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "bg-slate-900 border-r border-slate-800 transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors z-10 p-1 rounded-full"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 text-slate-400" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-slate-400" />
        )}
      </button>

      <nav className="space-y-2 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors relative group",
                activeView === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              )}
              title={isCollapsed && !item.hideTooltip ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && item.label && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              
              {/* Tooltip for collapsed state (only for non-dashboard items) */}
              {isCollapsed && !item.hideTooltip && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-100 text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
