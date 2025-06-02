//src/core/ports.ts
/**
 * Ports (interfaces) for the hexagonal architecture
 */

import { Command, Event, UUID } from './contracts';

/**
 * Inbound port for handling commands
 */
export interface CommandPort {
  dispatch(cmd: Command): Promise<void>;
}

/**
 * Inbound port for handling events
 */
export interface EventPort {
  on(event: Event): Promise<void>;
}

/**
 * Outbound port for storing events
 */
export interface EventStorePort {
  /**
   * Append events to the event store
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @param events Events to append
   * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
   */
  append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number): Promise<void>;

  /**
   * Load events for an aggregate
   * Pure event loader that loads events from a specific version.
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @param fromVersion Version to start loading events from (default: 0)
   * @returns Events and version, or null if aggregate doesn't exist
   */
  load(tenantId: UUID, aggregateType: string, aggregateId: UUID, fromVersion?: number): Promise<{ events: Event[]; version: number } | null>;

  /**
   * Load a snapshot for an aggregate
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @returns Snapshot version and state, or null if no snapshot exists
   */
  loadSnapshot(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ version: number; state: any } | null>;
}

/**
 * Outbound port for scheduling jobs/workflows
 */
export interface JobSchedulerPort {
  schedule(cmd: Command): Promise<void>;
}

/**
 * Outbound port for publishing events to clients
 */
export interface EventPublisherPort {
  publish(events: Event[]): Promise<void>;
}

/**
 * Outbound port for querying read models
 */
export interface ReadModelPort<T> {
  getById(tenant: UUID, id: UUID): Promise<T | null>;
  query(tenant: UUID, filter?: any): Promise<T[]>;
}

/**
 * Outbound port for updating read models
 */
export interface ReadModelUpdaterPort<T> {
  upsert(tenant: UUID, entity: T): Promise<void>;
  delete(tenant: UUID, id: UUID): Promise<void>;
}

/**
 * Outbound port for storing and tracking commands
 */
export interface CommandStorePort {
  /**
   * Persist a new command or upsert if it already exists (idempotent).
   */
  upsert(cmd: Command): Promise<void>;

  /**
   * Mark command status (e.g. after handling: 'consumed', 'failed', etc).
   * Optionally attach result/metadata.
   */
  markStatus(id: UUID, status: 'pending' | 'consumed' | 'failed', result?: any): Promise<void>;

  /**
   * Get a command by its ID.
   */
  getById(id: UUID): Promise<Command | null>;

  /**
   * Query commands (by status, type, tenant, etc).
   * Useful for pumps, audits, retries, or
   * replay: Cmd sourcing is generally discouraged. Use it for your edge cases if need be.
   */
  query(filter: {
    status?: 'pending' | 'consumed' | 'failed';
    tenant_id?: UUID;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Command[]>;

  /**
   * Close the command store connection.
   */
    close(): Promise<void>;
}

/**
 * Outbound port for logging
 */
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): LoggerPort;
}
