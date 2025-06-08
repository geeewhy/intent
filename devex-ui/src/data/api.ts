//devex-ui/src/data/api.ts
import { toast } from "@/components/ui/sonner";

// API client configuration
export const API_CONFIG = {
  baseUrl: localStorage.getItem('api_uri') || import.meta.env.VITE_API_URL || '',
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
  const url = API_CONFIG.baseUrl
      ? new URL(`${API_CONFIG.baseUrl}${endpoint}`)
      : new URL(endpoint, window.location.origin);

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
