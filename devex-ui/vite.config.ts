import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.VITE_API_MODE': JSON.stringify(process.env.VITE_API_MODE || 'mock'),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'process.env.VITE_API_NO_SWITCH': JSON.stringify(process.env.VITE_API_NO_SWITCH || '')
  },
}));
