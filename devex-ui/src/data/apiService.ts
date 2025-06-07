import { apiClient, API_CONFIG } from './api';
import type { Event, Command } from './types';
import type { LogLine } from './mockLogs';

// Events API
export const fetchEvents = async (tenantId: string, limit = 50): Promise<Event[]> => {
  return apiClient.get<Event[]>(API_CONFIG.endpoints.events, { 
    tenant_id: tenantId,
    limit: limit.toString()
  });
};

export const fetchEvent = async (eventId: string): Promise<Event> => {
  return apiClient.get<Event>(`${API_CONFIG.endpoints.events}/${eventId}`);
};

// Commands API
export const fetchCommands = async (tenantId: string, limit = 50): Promise<Command[]> => {
  return apiClient.get<Command[]>(API_CONFIG.endpoints.commands, { 
    tenant_id: tenantId,
    limit: limit.toString()
  });
};

export const submitCommand = async (command: Omit<Command, 'id' | 'status'>): Promise<{ 
  success: boolean; 
  commandId: string; 
  message?: string 
}> => {
  return apiClient.post(API_CONFIG.endpoints.commands, command);
};

export const fetchRecentCommands = async (limit = 10) => {
  return apiClient.get(`${API_CONFIG.endpoints.commands}/recent`, { 
    limit: limit.toString()
  });
};

// Traces API
export const searchTraces = async (query: string) => {
  return apiClient.get(`${API_CONFIG.endpoints.traces}/search`, { query });
};

export const fetchTracesByCorrelation = async (correlationId: string) => {
  return apiClient.get(`${API_CONFIG.endpoints.traces}/correlation/${correlationId}`);
};

export const fetchTraceById = async (traceId: string) => {
  return apiClient.get(`${API_CONFIG.endpoints.traces}/${traceId}`);
};

export const fetchLogs = (tenant: string, limit=50) =>
  apiClient.get<LogLine[]>(API_CONFIG.endpoints.logs, { tenant_id: tenant, limit: limit+'' });
