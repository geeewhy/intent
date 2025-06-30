//src/core/registry.ts
import { CommandHandler, EventHandler, SagaDefinition, ReadModelUpdaterPort, UUID } from './contracts';
import { AggregateClass } from './base/aggregate';
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
  // Build the handler once infra passes a getUpdater function
  factory(
    getUpdater: (table: string) => ReadModelUpdaterPort<any>
  ): EventHandler;
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

const registry: Registry = {
  aggregates: {},
  commandHandlers: {},
  eventHandlers: {},
  sagas: {},
  commandTypes: {},
  eventTypes: {},
  projections: {},
  domains: [],
  roles: {},
};

// --- Registration helpers
export function registerDomain(name: string): void {
  if (!registry.domains.includes(name)) registry.domains.push(name);
}

export function registerAggregate(type: string, cls: AggregateClass): void {
  if (registry.aggregates[type]) throw new Error(`Aggregate ${type} already registered`);
  registry.aggregates[type] = cls;
}

export function registerCommandHandler(name: string, h: CommandHandler): void {
  if (registry.commandHandlers[name]) throw new Error(`Command handler ${name} already registered`);
  registry.commandHandlers[name] = h;
}

export function registerEventHandler(name: string, h: EventHandler): void {
  if (registry.eventHandlers[name]) throw new Error(`Event handler ${name} already registered`);
  registry.eventHandlers[name] = h;
}

export function registerSaga(name: string, saga: SagaDefinition): void {
  if (registry.sagas[name]) throw new Error(`Saga ${name} already registered`);
  registry.sagas[name] = saga;
}

export function registerCommandType(
  t: string, 
  meta: Omit<CommandTypeMeta, 'type'>
): void {
  if (registry.commandTypes[t]) throw new Error(`Command type ${t} already registered`);
  registry.commandTypes[t] = { type: t, ...meta };
}

export function registerEventType(
  t: string, 
  meta: Omit<EventTypeMeta, 'type'>
): void {
  if (registry.eventTypes[t]) throw new Error(`Event type ${t} already registered`);
  registry.eventTypes[t] = { type: t, ...meta };
}

export function registerProjection(name: string, def: ProjectionDefinition): void {
  if (registry.projections[name]) throw new Error(`Projection ${name} already registered`);
  registry.projections[name] = def;
}

export function registerRoles(domain: string, roles: string[]): void {
  if (registry.roles[domain]) throw new Error(`Roles already registered for domain: ${domain}`);
  registry.roles[domain] = roles;
}

/*  --  --  --  Getters  --  --  --  */
export function getAllAggregates(): Record<string, AggregateClass> {
  return registry.aggregates;
}

export function getAllCommandHandlers(): Record<string, CommandHandler> {
  return registry.commandHandlers;
}

export function getAllEventHandlers(): Record<string, EventHandler> {
  return registry.eventHandlers;
}

export function getAllSagas(): Record<string, SagaDefinition> {
  return registry.sagas;
}

export function getAllCommandTypes(): Record<string, CommandTypeMeta> {
  return registry.commandTypes;
}

export function getAllEventTypes(): Record<string, EventTypeMeta> {
  return registry.eventTypes;
}

export function getAllProjections(): Record<string, ProjectionDefinition> {
  return registry.projections;
}

export function getAllDomains(): string[] {
  return registry.domains;
}

export function getAllRoles(): Record<string, string[]> {
  return registry.roles;
}

// -- convenience exports
export const DomainRegistry = {
  aggregates: getAllAggregates,
  commandHandlers: getAllCommandHandlers,
  eventHandlers: getAllEventHandlers,
  sagas: getAllSagas,
  commandTypes: getAllCommandTypes,
  eventTypes: getAllEventTypes,
  projections: getAllProjections,
  domains: getAllDomains,
  roles: getAllRoles,
};

export default DomainRegistry;