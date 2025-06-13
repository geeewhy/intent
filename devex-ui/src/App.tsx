// devex-ui/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppProvider } from '@/app/AppProvider';

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

const App = () => (
  <AppProvider>
    <TooltipProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            {/* Docs: root + /docs */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/docs" element={<WelcomePage />} />
            <Route path="/docs/:view" element={<WelcomePage />} />

            {/* DevX UI */}
            <Route path="/devx" element={<Index />} />
            {VIEWS.map(view => (
              <Route key={view} path={`/devx/${view}`} element={<Index />} />
            ))}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </AppProvider>
);

export default App;
