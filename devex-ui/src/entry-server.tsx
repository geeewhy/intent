// devex-ui/src/entry-server.tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

export function render(url: string, context: any) {
  // Only apply SSR to docs/**/* routes and WelcomePage when VITE_DEFAULT_PAGE === 'welcome'
  const isDocsRoute = url.startsWith('/docs');
  const isWelcomeRoute = url === '/welcome';
  const defaultPage = process.env.VITE_DEFAULT_PAGE || 'devx';
  const shouldApplySSR = isDocsRoute || (isWelcomeRoute && defaultPage === 'welcome');

  if (!shouldApplySSR) {
    // Return empty HTML for routes that don't need SSR
    return { html: '' };
  }

  // Render the app to a string
  const html = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );

  return { html };
}