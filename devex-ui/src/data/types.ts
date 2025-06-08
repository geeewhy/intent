//devex-ui/src/data/types.ts

export type UUID = string;

/**
 * Common Metadata across Commands and Events
 */
export interface Metadata {
  userId?: UUID; //AUTH/RBAC/RLS
  role?: string; //RBAC/RLS
  timestamp: string;
  correlationId?: UUID; // ID for tracking the flow of actions
  causationId?: UUID; // ID of the action that caused this command
  requestId?: string; // Useful for cross-service tracing
  source?: string;    // Service or workflow origin
  tags?: Record<string, string | number>; // For flexible enrichment
  schemaVersion?: number;
}

/**
 * Base Command interface with lifecycle hints
 */
export interface Command<T = unknown> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  status?: 'pending' | 'consumed' | 'processed' | 'failed';
  metadata?: Metadata;
  createdAt?: string;
  updatedAt?: string
  response?: unknown; // Optional response from API
}

/**
 * Base Event interface with versioning and full trace metadata
 */
export interface Event<T = unknown> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  aggregateId: UUID;
  aggregateType: string;
  version: number;
  status?: 'processed' | 'failed';
  metadata?: Metadata;
}

/**
 * Command Result returned from the server
 */
export type CommandResult = {
  status: 'success' | 'fail';
  events?: Event[];
  error?: string;
};
