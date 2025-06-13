import { CommandHandler, EventHandler, SagaDefinition, ReadModelUpdaterPort, UUID } from './contracts';
import { AggregateClass } from './aggregates';
import { z } from 'zod';
export interface CommandTypeMeta {
    type: string;
    domain: string;
    description: string;
    payloadSchema?: z.ZodTypeAny;
    aggregateRouting?: {
        aggregateType: string;
        extractId: (payload: any) => UUID;
    };
}
export interface EventTypeMeta {
    type: string;
    domain: string;
    description: string;
    payloadSchema?: z.ZodTypeAny;
}
export interface TableMeta {
    name: string;
    columnTypes: Record<string, string>;
}
export interface ProjectionDefinition {
    tables: TableMeta[];
    eventTypes: string[];
    factory(getUpdater: (table: string) => ReadModelUpdaterPort<any>): EventHandler;
}
export interface Registry {
    aggregates: Record<string, AggregateClass>;
    commandHandlers: Record<string, CommandHandler>;
    eventHandlers: Record<string, EventHandler>;
    sagas: Record<string, SagaDefinition>;
    commandTypes: Record<string, CommandTypeMeta>;
    eventTypes: Record<string, EventTypeMeta>;
    projections: Record<string, ProjectionDefinition>;
    domains: string[];
    roles: Record<string, string[]>;
}
export declare function registerDomain(name: string): void;
export declare function registerAggregate(type: string, cls: AggregateClass): void;
export declare function registerCommandHandler(name: string, h: CommandHandler): void;
export declare function registerEventHandler(name: string, h: EventHandler): void;
export declare function registerSaga(name: string, saga: SagaDefinition): void;
export declare function registerCommandType(t: string, meta: Omit<CommandTypeMeta, 'type'>): void;
export declare function registerEventType(t: string, meta: Omit<EventTypeMeta, 'type'>): void;
export declare function registerProjection(name: string, def: ProjectionDefinition): void;
export declare function registerRoles(domain: string, roles: string[]): void;
export declare function getAllAggregates(): Record<string, AggregateClass>;
export declare function getAllCommandHandlers(): Record<string, CommandHandler>;
export declare function getAllEventHandlers(): Record<string, EventHandler>;
export declare function getAllSagas(): Record<string, SagaDefinition>;
export declare function getAllCommandTypes(): Record<string, CommandTypeMeta>;
export declare function getAllEventTypes(): Record<string, EventTypeMeta>;
export declare function getAllProjections(): Record<string, ProjectionDefinition>;
export declare function getAllDomains(): string[];
export declare function getAllRoles(): Record<string, string[]>;
export declare const DomainRegistry: {
    aggregates: typeof getAllAggregates;
    commandHandlers: typeof getAllCommandHandlers;
    eventHandlers: typeof getAllEventHandlers;
    sagas: typeof getAllSagas;
    commandTypes: typeof getAllCommandTypes;
    eventTypes: typeof getAllEventTypes;
    projections: typeof getAllProjections;
    domains: typeof getAllDomains;
    roles: typeof getAllRoles;
};
export default DomainRegistry;
