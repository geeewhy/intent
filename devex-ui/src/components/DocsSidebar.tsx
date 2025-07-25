// devex-ui/src/components/DocsSidebar.tsx
import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
    Book,
    FileText,
    Code,
    BookOpen,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    Menu,
    X,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';

// types

type View = string;

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

// static nav
// todo glob sync

const NAV_ITEMS: NavItem[] = [
    {
        id: 'basics/introduction',
        label: 'Basics',
        icon: FileText,
        children: [
            {id: 'basics/introduction', label: 'Introduction'},
            {id: 'basics/project-structure', label: 'Project Structure'},
            {id: 'basics/quickstart', label: 'Quickstart'},
        ],
    },
    {
        id: 'architecture/architecture-overview',
        label: 'Architecture',
        icon: Book,
        children: [
            {id: 'architecture/architecture-overview', label: 'Overview'},
            {id: 'architecture/event-sourcing', label: 'Event Sourcing'},
            {id: 'architecture/cqrs-projections', label: 'CQRS & Projections'},
            {id: 'architecture/domain-modeling', label: 'Domain Modeling'},
            {id: 'architecture/temporal-workflows', label: 'Temporal Workflows'},
            {id: 'architecture/multi-tenancy-details', label: 'Multi-Tenancy'},
            {id: 'architecture/observability-details', label: 'Observability'},
            {id: 'architecture/testing-strategies', label: 'Testing Strategies'},
        ],
    },
    {
        id: 'devx/devx-ui',
        label: 'DevX',
        icon: Code,
        children: [
            {id: 'devx/devx-ui', label: 'DevX UI'},
            {id: 'devx/cli-tools', label: 'CLI Tools'},
        ],
    },
    {
        id: 'reflections/index',
        label: 'Reflections',
        icon: BookOpen,
        children: [
            {id: 'reflections/index', label: 'Overview'},
            {id: 'reflections/note-cqrs-projections', label: 'CQRS & Projections'},
            {id: 'reflections/note-domain-modeling', label: 'Domain Modeling'},
            {id: 'reflections/note-event-sourcing', label: 'Event Sourcing'},
            {id: 'reflections/note-multi-tenancy', label: 'Multi-Tenancy'},
            {id: 'reflections/note-observability', label: 'Observability'},
            {id: 'reflections/note-temporal-workflows', label: 'Temporal Workflows'},
            {id: 'reflections/note-testing-strategies', label: 'Testing Strategies'},
        ],
    },
];

const viewFromPath = (path: string): View => {
    const match = path.match(/^\/docs\/?(.*)$/);
    const slug = match?.[1] || null;
    return slug as View;
};

// Function to find which parent section a page belongs to
const findParentSection = (pageId: string): string | null => {
    for (const item of NAV_ITEMS) {
        if (item.id === pageId) return item.id;
        if (item.children?.some(child => child.id === pageId)) {
            return item.id;
        }
    }
    return null;
};

// -- component
export const DocsSidebar = ({onViewChange, activeView}: DocsSidebarProps) => {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const current = viewFromPath(pathname);

    // Auto-expand parent section when page changes
    useEffect(() => {
        const parentSection = findParentSection(current);
        if (parentSection) {
            setExpandedItems(prev => ({
                ...prev,
                [parentSection]: true
            }));
        }
    }, [current]);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <>
            {/* Hamburger menu button for mobile */}
            <button 
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-gray-800 text-white"
                aria-label="Toggle sidebar"
            >
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Sidebar */}
            <aside className={cn(
                "transition-all duration-300 fixed md:static top-0 left-0 h-full z-10 bg-gray-900 md:bg-transparent",
                "md:w-64",
                isSidebarOpen ? "w-64" : "w-0 md:w-64 overflow-hidden md:overflow-visible"
            )}>
                <nav className={cn(
                    "space-y-2 p-4",
                    "transition-all duration-200 delay-100",
                    isSidebarOpen 
                        ? "opacity-100 visible" 
                        : "opacity-0 invisible md:opacity-100 md:visible"
                )}>
                    {NAV_ITEMS.map(({id, label, icon: Icon, children}) => {
                        const isParentSelected = current === id;
                        const isExpanded = expandedItems[id] || false;
                        const hasChildren = children && children.length > 0;

                        return (
                            <div key={id} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleExpand(id);
                                        } else {
                                            navigate(`/docs/${id}`);
                                        }
                                        onViewChange?.(id);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                                        isParentSelected
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
                                        {children.map(child => {
                                            const isChildSelected = current === child.id;
                                            return (
                                                <button
                                                    key={child.id}
                                                    onClick={() => {
                                                        navigate(`/docs/${child.id}`);
                                                        onViewChange?.(child.id);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                                                        isChildSelected 
                                                            ? "text-blue-500 font-medium" 
                                                            : "text-slate-400 hover:text-white"
                                                    )}
                                                >
                                                    {child.label}
                                                </button>
                                            );
                                        })}
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
                            <LayoutDashboard className="h-4 w-4"/>
                            <span>Launch DevX Console</span>
                        </Button>
                    </div>
                </nav>
            </aside>
        </>
    );
};
