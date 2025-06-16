// devex-ui/src/entry-client.tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { setupMocks } from './setupMocks';

// Wait for mocks to be set up before hydrating
setupMocks().then(() => {
  const root = document.getElementById('root');
  
  if (root) {
    // Check if the current route should be server-side rendered
    const isDocsRoute = window.location.pathname.startsWith('/docs');
    const isWelcomeRoute = window.location.pathname === '/welcome';
    const defaultPage = import.meta.env.VITE_DEFAULT_PAGE || 'devx';
    const wasServerRendered = isDocsRoute || (isWelcomeRoute && defaultPage === 'welcome');
    
    if (wasServerRendered) {
      // Hydrate the server-rendered HTML
      hydrateRoot(
        root,
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
    } else {
      // For routes that weren't server-rendered, use createRoot
      import('react-dom/client').then(({ createRoot }) => {
        createRoot(root).render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      });
    }
  }
});