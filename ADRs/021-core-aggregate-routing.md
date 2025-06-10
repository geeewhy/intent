# ADR 021: Co-locate Aggregate Routing with Command Registration

## Context

The system currently registers command types separately from their routing logic. Routing to aggregates (i.e., deriving `aggregateType` and `aggregateId` from a command) is either inferred or redundantly handled elsewhere. This introduces implicit coupling and runtime ambiguity, especially for commands triggered via sagas or external workflows.

In particular:

* Aggregates rely on `aggregateId` and `aggregateType` being available in payloads.
* Command metadata lives in `DomainRegistry.commandTypes()` but lacks routing.
* Workflows (`processCommand`) must inject routing metadata for proper aggregate reconstruction.
* Ambiguous `aggregateId` primary key mappings

This violates the principle of co-location and increases the risk of drift between command schemas and routing logic.

## Decision

Extend `CommandTypeMeta` to include an optional `aggregateRouting` key:

```ts
aggregateRouting?: {
  aggregateType: string;
  extractId: (payload: any) => UUID;
};
```

Update all `registerCommandType()` calls (e.g., in `system/register.ts`) to include routing metadata where applicable.

During workflow dispatch in `WorkflowRouter.handle(cmd)`, inject routing data into command payloads before processing:

```ts
const meta = DomainRegistry.commandTypes()[cmd.type];
const routing = meta?.aggregateRouting;

if (routing) {
  cmd.payload.aggregateType ??= routing.aggregateType;
  cmd.payload.aggregateId ??= routing.extractId(cmd.payload);
}
```

## Consequences

### Pros

* Declarative routing co-located with command type definition
* Avoids ad-hoc inference of `aggregateType` / `aggregateId` at runtime
* Enables automated analysis (e.g., lint-payloads tool) to verify routing completeness
* Respects open/closed principle — saga/workflow code need not change per command type

### Cons

* Requires updating all `registerCommandType()` calls with routing
* Minor learning curve: developers must now specify `aggregateRouting` explicitly

## Alternatives Considered

* **Central Routing Table**: Rejected — adds indirection, risks desync, harder to statically analyze.
* **Assume client prepopulates routing**: Rejected — contradicts encapsulation; workflows should enforce context, not leak it.

## Implementation Notes

* A lint tool (`src/tools/lint-payloads.ts`) will enforce that all registered command types with `payloadSchema` also declare `aggregateRouting` (unless explicitly marked as saga-only).
* This ADR aligns with system goals of deterministic routing, explicit boundaries, and tooling-aware metadata propagation.
