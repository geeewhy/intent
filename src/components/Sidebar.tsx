
import { 
  Terminal, 
  Activity, 
  Database, 
  GitBranch, 
  Package, 
  AlertTriangle,
  Bot,
  Settings,
  Rewind
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
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
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4">
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                activeView === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
