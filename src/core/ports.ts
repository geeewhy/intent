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
  append(events: Event[]): Promise<void>;
  load(tenant: UUID, aggregateId: UUID): Promise<Event[]>;
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