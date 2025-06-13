// devex-ui/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppProvider } from '@/app/AppProvider';
import { useEffect, useState } from 'react';

import Index from './pages/Index';
import WelcomePage from './pages/WelcomePage';
import NotFound from './pages/NotFound';

/** all sidebar slugs except the default “dashboard” */
const VIEWS = [
  'commands',
  'events',
  'projections',
  'traces',
  'aggregates',
  'status',
  'rewind',
  'ai',
  'settings',
] as const;

const App = () => {
    // Check if docs mode is enabled via environment variable or localStorage
    const [isDocsMode, setIsDocsMode] = useState(() => {
        // First check localStorage (for switching between modes)
        const storedMode = localStorage.getItem('docs_mode');
        if (storedMode !== null) {
            return storedMode === 'true';
        }
        // Then check environment variable
        return import.meta.env.VITE_DOCS_MODE === 'true';
    });

    // Listen for storage changes (for cross-tab sync)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'docs_mode' && e.newValue !== null) {
                setIsDocsMode(e.newValue === 'true');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleSwitchToDocs = () => {
        localStorage.setItem('docs_mode', 'true');
        setIsDocsMode(true);
    };

    const handleSwitchToConsole = () => {
        localStorage.setItem('docs_mode', 'false');
        setIsDocsMode(false);
    };

    return (
        <AppProvider>
            <TooltipProvider>
                <ErrorBoundary>
                    <BrowserRouter>
                        {isDocsMode ? (
                            <Routes>
                                {/* Documentation routes */}
                                <Route path="/" element={<WelcomePage onSwitchToConsole={handleSwitchToConsole} />} />
                                <Route path="/docs" element={<WelcomePage onSwitchToConsole={handleSwitchToConsole} />} />
                                <Route path="/docs/:view" element={<WelcomePage onSwitchToConsole={handleSwitchToConsole} />} />

                                {/* fallback */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        ) : (
                            <Routes>
                                {/* dashboard */}
                                <Route path="/" element={<Index onSwitchToDocs={handleSwitchToDocs} />} />

                                {/* other sidebar views → same Index page for now */}
                                {VIEWS.map(view => (
                                    <Route 
                                        key={view} 
                                        path={`/${view}`} 
                                        element={<Index onSwitchToDocs={handleSwitchToDocs} />} 
                                    />
                                ))}

                                {/* fallback */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        )}
                    </BrowserRouter>
                </ErrorBoundary>
            </TooltipProvider>
        </AppProvider>
    );
};

export default App;
