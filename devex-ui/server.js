// devex-ui/server.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();

  let vite;
  if (!isProduction) {
    // Create Vite server in middleware mode
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the static files
    app.use(express.static(path.resolve(__dirname, 'dist/client')));
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    // Check if this route should be server-side rendered
    const isDocsRoute = url.startsWith('/docs');
    const isWelcomeRoute = url === '/welcome';
    const defaultPage = process.env.VITE_DEFAULT_PAGE || 'devx';
    const shouldApplySSR = isDocsRoute || (isWelcomeRoute && defaultPage === 'welcome');

    if (!shouldApplySSR) {
      // For routes that don't need SSR, just serve the index.html
      if (isProduction) {
        const indexHtml = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        );
        return res.status(200).set({ 'Content-Type': 'text/html' }).end(indexHtml);
      } else {
        // In development, let Vite transform the index.html
        let indexHtml = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        );
        indexHtml = await vite.transformIndexHtml(url, indexHtml);
        return res.status(200).set({ 'Content-Type': 'text/html' }).end(indexHtml);
      }
    }

    try {
      let template;
      let render;

      if (!isProduction) {
        // In development, get the template from index.html and transform it with Vite
        template = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        );
        template = await vite.transformIndexHtml(url, template);
        
        // Load the server entry module
        const { render: ssrRender } = await vite.ssrLoadModule('/src/entry-server.tsx');
        render = ssrRender;
      } else {
        // In production, use the built files
        template = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        );
        const { render: ssrRender } = await import('./dist/server/entry-server.js');
        render = ssrRender;
      }

      // Render the app
      const context = {};
      const { html: appHtml } = await render(url, context);

      if (context.url) {
        return res.redirect(301, context.url);
      }

      const html = template.replace('<!--ssr-outlet-->', appHtml);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      if (!isProduction) {
        vite.ssrFixStacktrace(e);
      }
      console.error(e);
      res.status(500).end(e.message);
    }
  });

  const port = process.env.PORT || 8081;
  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}

createServer();