// devex-ui/src/components/Sidebar.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatures } from '@/hooks/useFeatures';

/* ─────────────────────── Types / constants ────────────────────── */

type View =
    | 'dashboard'
    | 'commands'
    | 'events'
    | 'projections'
    | 'traces'
    | 'aggregates'
    | 'status'
    | 'rewind'
    | 'ai'
    | 'settings';

interface SidebarProps {
    onViewChange?: (view: View) => void;
    activeView?: View; // optional – parent can still control
}

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hideTooltip: true },
    { id: 'commands', label: 'Command Issuer', icon: Terminal },
    { id: 'events', label: 'Event Stream', icon: Activity },
    { id: 'projections', label: 'Projections', icon: Database, requiresFlag: 'projections' },
    { id: 'traces', label: 'Trace Viewer', icon: GitBranch },
    { id: 'aggregates', label: 'Aggregates', icon: Package, requiresFlag: 'aggregates' },
    { id: 'rewind', label: 'Projection Rewind', icon: Rewind, requiresFlag: 'rewind' },
    { id: 'status', label: 'System Status', icon: AlertTriangle },
    { id: 'ai', label: 'AI Companion', icon: Bot, requiresFlag: 'ai' },
    { id: 'settings', label: 'Settings', icon: Settings },
] as const;

/* ───────────────────────── helpers ─────────────────────────────── */

const pathForView = (view: View) => (view === 'dashboard' ? '/' : `/${view}`);

const viewFromPath = (path: string): View => {
    const slug = path === '/' ? 'dashboard' : path.replace(/^\//, '');
    return slug as View;
};

/* ───────────────────────── component ───────────────────────────── */

export const Sidebar = ({ onViewChange, activeView }: SidebarProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { enabled } = useFeatures();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    /* source of truth: prefer explicit prop, else derive from URL */
    const current = activeView ?? viewFromPath(pathname);

    /* when parent forces a view, navigate there */
    useEffect(() => {
        if (activeView) {
            const dest = pathForView(activeView);
            if (dest !== pathname) navigate(dest);
        }
        // ignore pathname in deps – we only care when activeView changes
    }, [activeView, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

    const items = useMemo(
        () => NAV_ITEMS.filter(i => !i.requiresFlag || enabled(i.requiresFlag)),
        [enabled],
    );

    return (
        <aside
            className={cn(
                'bg-slate-900 border-r border-slate-800 transition-all duration-300 relative',
                isCollapsed ? 'w-16' : 'w-64',
            )}
        >
            {/* Collapse toggle */}
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
                {items.map(({ id, label, icon: Icon, hideTooltip }) => {
                    const selected = current === id;
                    return (
                        <button
                            key={id}
                            onClick={() => {
                                /* update URL and notify parent */
                                navigate(pathForView(id as View));
                                onViewChange?.(id as View);
                            }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors relative group',
                                selected
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800',
                            )}
                            title={isCollapsed && !hideTooltip ? label : undefined}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="text-sm font-medium">{label}</span>}

                            {/* Tooltip for collapsed sidebar */}
                            {isCollapsed && !hideTooltip && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-100 text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                                    {label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};
