// Unique identifier type
export type UUID = string;

/**
 * Base command interface
 */
export interface Command<T = any> {
    id: UUID;
    tenant_id: UUID; // Household ID for multi-tenancy
    type: string;
    payload: T;
    status?: 'pending' | 'consumed' | 'processed' | 'failed';
    metadata?: {
        userId?: UUID | undefined;
        timestamp: Date;
        correlationId?: UUID;
        causationId?: UUID;
    };
}

/**
 * Base event interface
 */
export interface Event<T = any> {
    id: UUID;
    tenant_id: UUID; // Household ID for multi-tenancy
    type: string;
    payload: T;
    aggregateId: UUID;
    version: number;
    metadata?: {
        userId?: UUID;
        timestamp: Date;
        correlationId?: UUID;
        causationId?: UUID;
    };
}

export interface ProcessPlan {
    commands: Command[];
    delays?: { cmd: Command; ms: number }[];
}

export interface SagaDefinition {
    idFor: (input: Command | Event) => string | undefined;
    plan: (input: Command | Event, ctx: SagaContext) => Promise<ProcessPlan>;
    workflow?: string; // optional override, defaults to 'processSaga'
}

export interface SagaContext {
    nextId: () => Promise<string>;
}