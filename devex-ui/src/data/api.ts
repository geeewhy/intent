//devex-ui/src/data/api.ts
// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Safely access localStorage
const getLocalStorage = (key: string): string | null => {
  if (isBrowser) {
    return localStorage.getItem(key);
  }
  return null;
};

const apiMode = getLocalStorage('api_mode') || import.meta.env.VITE_API_MODE || 'mock';

// API client configuration
export const API_CONFIG = {
  baseUrl: getLocalStorage('api_uri') || import.meta.env.VITE_API_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/events/stream',
  endpoints: {
    events: '/api/events',
    commands: '/api/commands',
    traces: '/api/traces',
    aggregates: '/api/aggregates',
    logs: '/api/logs',
    registry: '/api/registry/commands'
  }
};

// --- URL builder
function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const base = apiMode === 'mock' ? '' : (getLocalStorage('api_uri') || import.meta.env.VITE_API_URL || '');

  // Use a default origin for SSR
  const origin = isBrowser ? window.location.origin : 'http://localhost';

  // Create URL with the appropriate origin
  const url = new URL(`${base}${endpoint}`, origin);

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  return url.toString();
}

// --- Thin fetch wrapper (GET/POST)
export const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const res = await fetch(buildUrl(endpoint, params), {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`GET ${endpoint} -> ${res.status}`);
    return res.json();
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const res = await fetch(buildUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`POST ${endpoint} -> ${res.status}`);
    return res.json();
  }
};
