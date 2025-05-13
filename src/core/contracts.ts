//src/core/contracts.ts

export type UUID = string;

/**
 * Common Metadata across Commands and Events
 */
export interface Metadata {
    userId?: UUID;
    timestamp: Date;
    correlationId?: UUID;
    causationId?: UUID;
    requestId?: string; // Useful for cross-service tracing
    source?: string;    // Service or workflow origin
    tags?: Record<string, string | number>; // For flexible enrichment
}

/**
 * Base Command interface with lifecycle hints
 */
export interface Command<T = any> {
    id: UUID;
    tenant_id: UUID;
    type: string;
    payload: T;
    status?: 'pending' | 'consumed' | 'processed' | 'failed';
    metadata?: Metadata;
}

/**
 * Base Event interface with versioning and full trace metadata
 */
export interface Event<T = any> {
    id: UUID;
    tenant_id: UUID;
    type: string;
    payload: T;
    aggregateId: UUID;
    aggregateType: string;
    version: number;
    metadata?: Metadata;
}

/**
 * Process plan emitted by sagas or workflows
 */
export interface ProcessPlan {
    commands: Command[];
    delays?: { cmd: Command; ms: number }[];
    traceContext?: Record<string, any>; // Optional tracing metadata for observability
}

/**
 * Contract for defining saga orchestration logic
 */
export interface SagaDefinition {
    idFor: (input: Command | Event) => string | undefined;
    plan: (input: Command | Event, ctx: SagaContext) => Promise<ProcessPlan>;
    workflow?: string; // Label for orchestration mechanism ('saga' or 'process')
}

/**
 * Context passed to sagas for deterministic orchestration with optional utilities
 */
export interface SagaContext {
    readonly correlationId?: string;
    nextId(): Promise<UUID>;
    loadAggregate?<T>(aggregateType: string, aggregateId: UUID): Promise<T>;
    loadEvents?(aggregateType: string, aggregateId: UUID): Promise<Event[]>;
    getHint?<T = any>(key: string): T | undefined;
    evaluateCondition?(name: string, args?: any): Promise<boolean>;
    emitInternalSignal?(name: string, data: Record<string, any>): void;
}

/**
 * observability related signals
 */

export enum InternalSignalType {
    OBS_TRACE = 'obs.trace',
    OBS_WARN = 'obs.warn',
    OBS_ERROR = 'obs.error',
    OBS_METRIC = 'obs.metric',
}

export type InternalSignalPayload =
    | { type: 'obs.trace'; span: string; data?: any }
    | { type: 'obs.warn'; message: string; tags?: Record<string, any> }
    | { type: 'obs.error'; message: string; error?: any; tags?: Record<string, any> }
    | { type: 'obs.metric'; name: string; value: number; tags?: Record<string, any> };

/**
 * Projection interfaces
 */

/**
 * Event handler for projections
 */
export interface EventHandler<E extends Event = Event> {
  supportsEvent(event: Event): event is E;
  handle(event: E): Promise<void>;
}

/**
 * Port for updating read models
 */
export interface ReadModelUpdaterPort<T> {
  upsert(tenantId: string, id: string, data: T): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}
