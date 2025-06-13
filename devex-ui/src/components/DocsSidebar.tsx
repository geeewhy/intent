// devex-ui/src/components/DocsSidebar.tsx
import { useState } from 'react';
import {
    Book,
    FileText,
    Code,
    BookOpen,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ─────────────────────── Types / constants ────────────────────── */

type View = 'welcome' | 'guidelines' | 'architecture' | 'examples' | 'references';

interface DocsSidebarProps {
    onViewChange?: (view: View) => void;
    activeView?: View;
    onSwitchToConsole?: () => void;
}

interface NavItem {
    id: View;
    label: string;
    icon: React.ElementType;
    children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { 
        id: 'guidelines', 
        label: 'Guidelines', 
        icon: FileText,
        children: [
            { id: 'simplicity', label: 'Simplicity of Event Sourcing' },
            { id: 'initial-setup', label: 'Initial Setup' },
        ]
    },
    { id: 'architecture', label: 'Architecture', icon: Book },
    { id: 'examples', label: 'Examples', icon: Code },
    { id: 'references', label: 'References', icon: BookOpen },
];

/* ───────────────────────── component ───────────────────────────── */

export const DocsSidebar = ({ onViewChange, activeView, onSwitchToConsole }: DocsSidebarProps) => {
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
        guidelines: true, // Start with guidelines expanded
    });

    /* source of truth: prefer explicit prop, else derive from URL */
    const current = activeView || 'welcome';

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <aside className="w-64 transition-all duration-300">
            <nav className="space-y-2 p-4">
                {NAV_ITEMS.map(({ id, label, icon: Icon, children }) => {
                    const selected = current === id;
                    const isExpanded = expandedItems[id];
                    const hasChildren = children && children.length > 0;

                    return (
                        <div key={id} className="space-y-1">
                            <button
                                onClick={() => {
                                    if (hasChildren) {
                                        toggleExpand(id);
                                    }
                                    onViewChange?.(id);
                                }}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                                    selected
                                        ? 'text-blue-500 font-medium'
                                        : 'text-slate-300 hover:text-white',
                                )}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span className="text-sm font-medium flex-1">{label}</span>
                                {hasChildren && (
                                    isExpanded ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {/* Children items */}
                            {hasChildren && isExpanded && (
                                <div className="ml-8 space-y-1">
                                    {children.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                // For now, just navigate to the parent view
                                                onViewChange?.(id);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-400 hover:text-white transition-colors"
                                        >
                                            {child.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Switch to Console button at the bottom */}
                <div className="pt-4 mt-4">
                    <Button
                        onClick={onSwitchToConsole}
                        variant="ghost"
                        className="w-full flex items-center gap-2 justify-start text-slate-300 hover:text-white"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span>Switch to DevX Console</span>
                    </Button>
                </div>
            </nav>
        </aside>
    );
};
