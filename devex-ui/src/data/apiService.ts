//devex-ui/src/data/apiService.ts
import { apiClient, API_CONFIG } from './api';
import type { Event, Command, CommandResult, CommandSchema } from './types';
import type { LogLine } from './mockLogs';
import { isMock } from '@/config/apiMode';
import { findTracesByCorrelationId, searchTracesFullText, traceStore } from '@/mocks/stores/trace.store';
import { generateEdges } from '@/graph/edgeUtils';

// Events API
export const fetchEvents = async (tenantId: string, limit = 50): Promise<Event[]> => {
  const raw = await apiClient.get<any[]>(API_CONFIG.endpoints.events, {
    tenant_id: tenantId,
    limit: limit.toString()
  });

  return raw.map((e) => ({
    ...e,
    aggregateId: e.aggregate_id,
    aggregateType: e.aggregate_type,
    timestamp: e.created_at,
    metadata: {
      ...e.metadata,
      timestamp: e.created_at
    },
    status: 'processed' // optional for UI styling
  }));
};

export const fetchEvent = async (eventId: string): Promise<Event> => {
  const raw = await apiClient.get<any>(`${API_CONFIG.endpoints.events}/${eventId}`);

  return {
    ...raw,
    aggregateId: raw.aggregate_id,
    aggregateType: raw.aggregate_type,
    timestamp: raw.created_at,
    metadata: {
      ...raw.metadata,
      timestamp: raw.created_at
    },
    status: 'processed'
  };
};

// Commands API
export const fetchCommands = async (tenantId: string, limit = 50): Promise<Command[]> => {
  return apiClient.get<Command[]>(API_CONFIG.endpoints.commands, { 
    tenant_id: tenantId,
    limit: limit.toString()
  });
};

export const submitCommand = async (command: Command): Promise<CommandResult> => {
  return apiClient.post(API_CONFIG.endpoints.commands, command);
};

export const fetchRecentCommands = async (limit = 10) => {
  return apiClient.get(`${API_CONFIG.endpoints.commands}/recent`, { 
    limit: limit.toString()
  });
};

// Traces API
// Helper function to normalize trace data from API
function normalizeTrace(raw: any) {
  return {
    id: raw.id,
    type: raw.type || 'Event',
    subtype: raw.subtype || raw.type,
    timestamp: raw.timestamp || raw.created_at,
    correlationId: raw.correlationId || raw.correlation_id,
    causationId: raw.causationId || raw.causation_id,
    aggregateId: raw.aggregateId || raw.aggregate_id,
    tenantId: raw.tenantId || raw.tenant_id,
    level: raw.level ?? 0
  };
}

export const searchTraces = async (query: string) => {
  if (isMock) return searchTracesFullText(query);
  const raw = await apiClient.get(`${API_CONFIG.endpoints.traces}/search`, { query });
  // Filter out snapshots from search results
  return raw
    .filter(trace => trace.type !== 'Snapshot')
    .map(normalizeTrace);
};

export const fetchTracesByCorrelation = async (correlationId: string) => {
  if (isMock) {
    const traces = findTracesByCorrelationId(correlationId);
    const edges = generateEdges(traces);
    return { traces, edges };
  }
  const raw = await apiClient.get(`${API_CONFIG.endpoints.traces}/correlation/${correlationId}`);
  return {
    traces: raw.traces.map(normalizeTrace),
    edges: raw.edges
  };
};


export const fetchLogs = (tenant: string, limit=50) =>
  apiClient.get<LogLine[]>(API_CONFIG.endpoints.logs, { tenant_id: tenant, limit: limit+'' });

// Registry API
export const fetchCommandRegistry = async (): Promise<CommandSchema[]> => {
  return apiClient.get<CommandSchema[]>(API_CONFIG.endpoints.registry, { includeSchema: 'true' });
};

export const fetchRolesByDomain = async (domain: string): Promise<string[]> => {
  const result = await apiClient.get<Record<string, string[]>>('/api/registry/roles');
  return result[domain] ?? [];
};
