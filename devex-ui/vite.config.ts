import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { plugin as Markdown } from 'vite-plugin-markdown';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isSSR = command === 'build' && process.env.SSR === 'true';

  return {
    root: './',
    server: {
      host: "::",
      port: 8080,
      historyApiFallback: true,
      fs: {
        allow: ['..'], // allow ../docs
      },
    },
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        plugins: [],
        // Enable SSR
        ssr: isSSR,
      }),
      mode === 'development' &&
      componentTagger(),
      Markdown({ mode: ['raw'] }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "$docs": path.resolve(__dirname, "./docs"), //symlink follow
      },
    },
    define: {
      'process.env.VITE_API_MODE': JSON.stringify(process.env.VITE_API_MODE || 'mock'),
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
      'process.env.VITE_API_NO_SWITCH': JSON.stringify(process.env.VITE_API_NO_SWITCH || ''),
      'import.meta.env.VITE_DEFAULT_PAGE': JSON.stringify(process.env.VITE_DEFAULT_PAGE || 'devx')
    },
    // SSR configuration
    build: {
      ssr: isSSR ? './src/entry-server.tsx' : undefined,
      outDir: isSSR ? 'dist/server' : 'dist/client',
      rollupOptions: {
        input: isSSR 
          ? './src/entry-server.tsx' 
          : './index.html',
      },
    },
  };
});
