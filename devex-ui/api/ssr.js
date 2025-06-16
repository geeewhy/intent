// api/ssr.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from '../dist/server/entry-server.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    const url = req.url;

    // Check if this route should be server-side rendered
    const isDocsRoute = url.startsWith('/docs');
    const isWelcomeRoute = url === '/welcome';
    const defaultPage = process.env.VITE_DEFAULT_PAGE || 'devx';
    const shouldApplySSR = isDocsRoute || (isWelcomeRoute && defaultPage === 'welcome');

    if (!shouldApplySSR) {
      // For routes that don't need SSR, just serve the index.html
      const indexHtml = fs.readFileSync(
        path.resolve(__dirname, '../dist/client/index.html'),
        'utf-8'
      );
      return res.status(200).setHeader('Content-Type', 'text/html').send(indexHtml);
    }

    // Get the template
    const template = fs.readFileSync(
      path.resolve(__dirname, '../dist/client/index.html'),
      'utf-8'
    );

    // Render the app
    const context = {};
    const { html: appHtml } = await render(url, context);

    // If the context has a URL property, that means there was a redirect
    if (context.url) {
      return res.redirect(301, context.url);
    }

    // Replace the <!--ssr-outlet--> placeholder with the app HTML
    const html = template.replace('<!--ssr-outlet-->', appHtml);

    return res.status(200).setHeader('Content-Type', 'text/html').send(html);
  } catch (e) {
    console.error(e);
    return res.status(500).send(e.message);
  }
}