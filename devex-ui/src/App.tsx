// devex-ui/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppProvider } from '@/app/AppProvider';

import Index from './pages/Index';
import DocsPage from './pages/DocsPage';
import NotFound from './pages/NotFound';
import { Navigate } from 'react-router-dom';
import WelcomePage from "@/pages/WelcomePage.tsx";
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
            <Route
                path="/"
                element={
                  <Navigate to={`/${import.meta.env.VITE_DEFAULT_PAGE}`} replace />
                }
            />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/docs" element={<Navigate to="/docs/basics/introduction" replace />} />
            <Route path="/docs/*" element={<DocsPage />} />

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
