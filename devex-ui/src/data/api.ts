//devex-ui/src/data/api.ts
import { toast } from "@/components/ui/sonner";

// WebSocket connection for live streaming
export class EventStreamWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1_000;

  constructor(private url: string, private tenantId: string) {}

  connect(onEvent: (e: any) => void, onError?: (err: Event) => void) {
    try {
      this.ws = new WebSocket(`${this.url}?tenant=${this.tenantId}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('[WS] connected');
      };

      this.ws.onmessage = (m) => {
        try {
          onEvent(JSON.parse(m.data));
        } catch (err) {
          console.error('[WS] JSON parse error', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] closed – reconnecting…');
        this.reconnect(onEvent, onError);
      };

      this.ws.onerror = (e) => onError?.(e);
    } catch (err) {
      console.error('[WS] connection failed', err);
      onError?.(err as any);
    }
  }

  private reconnect(onEvent: (e: any) => void, onError?: (err: Event) => void) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] max reconnect attempts reached');
      toast.error('WebSocket connection failed', {
        description: 'Could not reconnect after multiple attempts. Try reconnecting manually.'
      });
      return;
    }
    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
    setTimeout(() => this.connect(onEvent, onError), delay);
  }

  manualReconnect(onEvent: (e: any) => void, onError?: (err: Event) => void) {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect(onEvent, onError);
    toast.info('Reconnecting to WebSocket', {
      description: 'Attempting to establish a new connection...'
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('[WS] not open');
    }
  }
}

// API client configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/events/stream',
  endpoints: {
    events: '/api/events',
    commands: '/api/commands',
    traces: '/api/traces',
    aggregates: '/api/aggregates',
    logs: '/api/logs'
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
