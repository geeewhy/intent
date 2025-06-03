# ADR-020: Unified Core Domain Registry

## Context

The current codebase wires domains through a `domains.ts` barrel file and explicit imports scattered across infrastructure layers.

* Adding a domain requires manual updates to multiple files.
* Command-bus, workflow router, projections loader and activities depend on hard-coded lists.
 To support rapid growth and reduce coupling we need a mechanism that lets a domain register all of its artefacts (aggregates, command/event types, handlers, sagas, projections) simply by being imported once.

## Decision

### 1 Create a Central Registry Singleton

`src/core/registry.ts`

```ts
import { CommandHandler, EventHandler } from './contracts';
import { AggregateClass } from './aggregates';

export interface Registry {
 aggregates: Record<string, AggregateClass>;
 commandHandlers: Record<string, CommandHandler>;
 eventHandlers: Record<string, EventHandler>;
 sagas: Record<string, unknown>;
 commandTypes: Record<string, unknown>;
 eventTypes: Record<string, unknown>;
 projections: Record<string, EventHandler>;
 domains: string[];
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
};

/* ——— Registration helpers ——— */
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

export function registerSaga(name: string, saga: unknown): void {
 if (registry.sagas[name]) throw new Error(`Saga ${name} already registered`);
 registry.sagas[name] = saga;
}

export function registerCommandType(t: string, meta: unknown): void {
 if (registry.commandTypes[t]) throw new Error(`Command type ${t} already registered`);
 registry.commandTypes[t] = { type: t, ...meta };
}

export function registerEventType(t: string, meta: unknown): void {
 if (registry.eventTypes[t]) throw new Error(`Event type ${t} already registered`);
 registry.eventTypes[t] = { type: t, ...meta };
}

export function registerProjection(name: string, p: EventHandler): void {
 if (registry.projections[name]) throw new Error(`Projection ${name} already registered`);
 registry.projections[name] = p;
}

/* ——— Read-only getters ——— */
export const DomainRegistry = {
 aggregates: () => registry.aggregates,
 commandHandlers: () => registry.commandHandlers,
 eventHandlers: () => registry.eventHandlers,
 sagas: () => registry.sagas,
 commandTypes: () => registry.commandTypes,
 eventTypes: () => registry.eventTypes,
 projections: () => registry.projections,
 domains: () => registry.domains,
};
export default DomainRegistry;
```

### 2 Domain Self-Registration Contract

Every domain exports a file `register.ts` that runs at import time. Example for `system` domain:

`src/core/system/register.ts`

```ts
import {
 registerDomain,
 registerAggregate,
 registerCommandHandler,
 registerSaga,
 registerCommandType,
 registerEventType,
} from '../registry';

import { SystemAggregate } from './aggregates/system.aggregate';
import { SystemCommandHandler } from './command-handler';
import { systemSagaRegistry } from './sagas/saga-registry';
import { SystemCommandType, SystemEventType } from './contracts';

export function registerSystemDomain(): void {
 registerDomain('system');

 registerAggregate('system', SystemAggregate);
 registerCommandHandler('system', new SystemCommandHandler());

 Object.entries(systemSagaRegistry).forEach(([n, s]) => registerSaga(n, s));

 Object.values(SystemCommandType).forEach(t =>
  registerCommandType(t, { domain: 'system', description: `System command: ${t}` }),
 );
 Object.values(SystemEventType).forEach(t =>
  registerEventType(t, { domain: 'system', description: `System event: ${t}` }),
 );
}

/* Auto-execute */
registerSystemDomain();
```

### 3 Initialization Loader

`src/core/initialize.ts`

```ts
import { DomainRegistry } from './registry';

/* Import side-effect registrations */
import './system/register';
// future domains import here

export async function initializeCore(): Promise<void> {
 console.info(
  `Core initialised: ${DomainRegistry.domains().length} domains, ` +
   `${Object.keys(DomainRegistry.aggregates()).length} aggregates, ` +
   `${Object.keys(DomainRegistry.commandHandlers()).length} command handlers, ` +
   `${Object.keys(DomainRegistry.sagas()).length} sagas, ` +
   `${Object.keys(DomainRegistry.commandTypes()).length} command types, ` +
   `${Object.keys(DomainRegistry.eventTypes()).length} event types`,
 );
}
```

### 4 Infrastructure Refactors

* **Command bus** – instantiate from registry:

 `src/core/command-bus.ts`

 ```ts
 import { CommandHandler } from './contracts';
 import { DomainRegistry } from './registry';

 export class CommandBus {
  private handlers: CommandHandler[];

  constructor() {
   this.handlers = Object.values(DomainRegistry.commandHandlers());
  }

  // dispatch logic unchanged
 }
 ```

* **Temporal activities** – replace previous `getCommandBus()` import:

 ```ts
 import { CommandBus } from '../../../core/command-bus';
 const commandBus = new CommandBus();
 ```

* **Workflow router** – consume saga registry:

 ```ts
 import { DomainRegistry } from '../../core/registry';
 const SagaRegistry = DomainRegistry.sagas();
 ```

* **Projection loader** – resolve per-domain modules:

 `src/infra/projections/loadProjections.ts`

 ```ts
 import { DomainRegistry } from '../../core/registry';
 // as in original prompt
 ```

* **Domain projection registration** – push into central registry when built:

 ```ts
 import { registerProjection } from '../../registry';
 registerProjection('systemStatus', projection);
 ```

### 5 HTTP Registry Endpoint

`src/api/registry.ts`

```ts
import { DomainRegistry } from '../core/registry';
import { initializeCore } from '../core/initialize';

export function registerRegistryRoutes(app: any) {
 initializeCore();

 app.get('/api/registry', (_req, res) =>
  res.json({
   domains: DomainRegistry.domains(),
   aggregates: Object.keys(DomainRegistry.aggregates()),
   sagas: Object.keys(DomainRegistry.sagas()),
   commandTypes: DomainRegistry.commandTypes(),
   eventTypes: DomainRegistry.eventTypes(),
  }),
 );

 app.get('/api/registry/commands', (req, res) => {
  const d = req.query.domain as string | undefined;
  const list = Object.values(DomainRegistry.commandTypes());
  res.json(d ? list.filter(c => c.domain === d) : list);
 });

 app.get('/api/registry/events', (req, res) => {
  const d = req.query.domain as string | undefined;
  const list = Object.values(DomainRegistry.eventTypes());
  res.json(d ? list.filter(e => e.domain === d) : list);
 });
}
```

### 6 Deletion of `domains.ts`

Remove the file and update all previous imports to use registry getters as illustrated above.

### 7 Implementation Checklist

1. Add `src/core/registry.ts`.
2. Add `register.ts` for each existing domain; import these in `initialize.ts`.
3. Replace manual handler wiring in command-bus, activities, router, and projection loader.
4. Delete `domains.ts` and clean obsolete imports.
5. Introduce `/api/registry` routes for external discovery.

## Consequences

* **Modularity** – a new domain requires only its own `register.ts`.
* **Runtime safety** – duplicate registrations throw immediately.
* **Backwards compatible** – existing logic now resolves through registry without changing call signatures.
* **Observability** – the HTTP endpoint surfaces current domain inventory for tooling and UI.
