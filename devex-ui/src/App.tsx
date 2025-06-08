// devex-ui/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppProvider } from '@/app/AppProvider';

import Index from './pages/Index';
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

const App = () => (
    <AppProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* dashboard */}
              <Route path="/" element={<Index />} />

              {/* other sidebar views → same Index page for now */}
              {VIEWS.map(view => (
                  <Route key={view} path={`/${view}`} element={<Index />} />
              ))}

              {/* fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AppProvider>
);

export default App;
