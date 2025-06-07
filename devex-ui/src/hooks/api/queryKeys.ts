/**
 * Shared query key utilities for React Query
 * 
 * This file contains functions for generating consistent query keys
 * across the application. This ensures that data fetching and cache
 * invalidation work correctly.
 */

/**
 * Generate a query key for events
 */
export const eventsKeys = {
  all: ['events'] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  list: (tenant: string, limit?: number) => 
    [...eventsKeys.lists(), tenant, limit] as const,
  details: () => [...eventsKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
};

/**
 * Generate a query key for logs
 */
export const logsKeys = {
  all: ['logs'] as const,
  lists: () => [...logsKeys.all, 'list'] as const,
  list: (tenant: string, limit?: number) => 
    [...logsKeys.lists(), tenant, limit] as const,
};

/**
 * Generate a query key for commands
 */
export const commandsKeys = {
  all: ['commands'] as const,
  lists: () => [...commandsKeys.all, 'list'] as const,
  list: (tenant: string, limit?: number) => 
    [...commandsKeys.lists(), tenant, limit] as const,
};

/**
 * Generate a query key for traces
 */
export const tracesKeys = {
  all: ['traces'] as const,
  lists: () => [...tracesKeys.all, 'list'] as const,
  list: (tenant: string, limit?: number) => 
    [...tracesKeys.lists(), tenant, limit] as const,
  details: () => [...tracesKeys.all, 'detail'] as const,
  detail: (id: string) => [...tracesKeys.details(), id] as const,
};