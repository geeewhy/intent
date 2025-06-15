// devex-ui/src/components/DocsSidebar.tsx
import {useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
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
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';

/* ─────────────────────── Types / constants ────────────────────── */

type View =
    | 'welcome'
    | 'project-structure'
    | 'quickstart'
    | 'architecture-overview'
    | 'cqrs-projections'
    | 'domain-modeling'
    | 'temporal-workflows'
    | 'multi-tenancy'
    | 'observability'
    | 'testing'
    | 'devx-ui'
    | 'cli-tools'
    | 'reflections';

interface DocsSidebarProps {
    onViewChange?: (view: View) => void;
    activeView?: View;
}

interface NavItem {
    id: View;
    label: string;
    icon: React.ElementType;
    children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'welcome',
        label: 'Basics',
        icon: FileText,
        children: [
            {id: 'welcome', label: 'Introduction'},
            {id: 'project-structure', label: 'Project Structure'},
            {id: 'quickstart', label: 'Quickstart'},
        ],
    },
    {
        id: 'architecture-overview',
        label: 'Architecture',
        icon: Book,
        children: [
            {id: 'architecture-overview', label: 'Overview'},
            {id: 'cqrs-projections', label: 'CQRS & Projections'},
            {id: 'domain-modeling', label: 'Domain Modeling'},
            {id: 'temporal-workflows', label: 'Temporal Workflows'},
            {id: 'multi-tenancy', label: 'Multi-Tenancy'},
            {id: 'observability', label: 'Observability'},
            {id: 'testing', label: 'Testing Strategies'},
        ],
    },
    {
        id: 'devx-ui',
        label: 'DevX',
        icon: Code,
        children: [
            {id: 'devx-ui', label: 'DevX UI'},
            {id: 'cli-tools', label: 'CLI Tools'},
        ],
    },
    {
        id: 'reflections',
        label: 'Reflections',
        icon: BookOpen,
        children: [
            {id: 'reflections', label: 'Overview'},
            {id: 'note-cqrs-projections', label: 'CQRS & Projections'},
            {id: 'note-domain-modeling', label: 'Domain Modeling'},
            {id: 'note-event-sourcing', label: 'Event Sourcing'},
            {id: 'note-multi-tenancy', label: 'Multi-Tenancy'},
            {id: 'note-observability', label: 'Observability'},
            {id: 'note-temporal-workflows', label: 'Temporal Workflows'},
            {id: 'note-testing-strategies', label: 'Testing Strategies'},
        ],
    },
];

const viewFromPath = (path: string): View => {
    const match = path.match(/^\/docs\/?(.*)$/);
    const slug = match?.[1] || 'welcome';
    return slug as View;
};

/* ───────────────────────── component ───────────────────────────── */

export const DocsSidebar = ({onViewChange, activeView}: DocsSidebarProps) => {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
        guidelines: true, // Start with guidelines expanded
    });

    /* source of truth: prefer explicit prop, else derive from URL */
    const current = viewFromPath(pathname);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <aside className="w-64 transition-all duration-300">
            <nav className="space-y-2 p-4">
                {NAV_ITEMS.map(({id, label, icon: Icon, children}) => {
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
                                <Icon className="h-5 w-5 flex-shrink-0"/>
                                <span className="text-sm font-medium flex-1">{label}</span>
                                {hasChildren && (
                                    isExpanded ?
                                        <ChevronUp className="h-4 w-4"/> :
                                        <ChevronDown className="h-4 w-4"/>
                                )}
                            </button>

                            {/* Children items */}
                            {hasChildren && isExpanded && (
                                <div className="ml-8 space-y-1">
                                    {children.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                navigate(`/docs/${child.id}`);
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
                        onClick={() => navigate('/devx')}
                        variant="secondary"
                        className="w-full flex items-center gap-2 justify-start text-slate-300 hover:text-white"
                    >
                        <ExternalLink className="h-4 w-4"/>
                        <span>Switch to DevX Console</span>
                    </Button>
                </div>
            </nav>
        </aside>
    );
};
