# ADR 019: Centralized Logging Port Across Core and Infra

## Context

Logging in the system is currently done ad-hoc using `console.log`, scattered across both core and infra. This prevents:

* Standardization of log formats
* Inclusion of correlation/tenant context
* Toggleable logging in tests
* Determinism in core logic

We want centralized logging without polluting core code with direct logger injections. Logging must be standardized, scoped, and pluggable.

## Decision

We introduce a `LoggerPort` interface, exposed via an execution-context-style accessor (`log()`), and bind a real logger implementation (`stdLogger`) at the Temporal worker bootstrap layer. This preserves core determinism while enabling structured, contextual logging across all layers.

---

## Structure

### `LoggerPort` (in `src/core/ports.ts`)

```ts
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}
```

---

### Log Context Accessor (in `src/core/contracts.ts`)

```ts
import type { LoggerPort } from './ports';

let getLogger: (() => LoggerPort | undefined) | null = null;

export function setLoggerAccessor(fn: () => LoggerPort | undefined) {
  getLogger = fn;
}

export function log(): LoggerPort | undefined {
  return getLogger?.();
}
```

This enables core to log *optionally* and safely without any runtime or test coupling.

---

### Pino Adapter as Logger Implementation (in `src/infra/logger/stdLogger.ts`)

```ts
import pino from 'pino';
import dotenv from 'dotenv';
import { LoggerPort } from '../../core/ports';

dotenv.config();

const baseLogger = pino({
  name: 'temporal-worker',
  level: process.env.LOG_LEVEL || 'info', // Default fallback
  formatters: {
    bindings: (bindings) => ({ pid: bindings.pid }),
    level: (label) => ({ level: label }),
  },
});

export const stdLogger: LoggerPort = {
  info: (msg, ctx) => baseLogger.info(ctx ?? {}, msg),
  warn: (msg, ctx) => baseLogger.warn(ctx ?? {}, msg),
  error: (msg, ctx) => baseLogger.error(ctx ?? {}, msg),
  debug: (msg, ctx) => baseLogger.debug(ctx ?? {}, msg),
};
```

---

### Runtime Binding (e.g., `worker.ts` or bootstrap file)

```ts
import { setLoggerAccessor } from '../../core/contracts';
import { stdLogger } from '../logger/stdLogger';

setLoggerAccessor(() => stdLogger);
```

Tests can override this with a mock logger or no-op.

---

### Usage in Core (e.g., `command-bus.ts`)

```ts
import { log } from './contracts';

log()?.info('Registered handler', { handlerName: handler.constructor.name });
```

---

### Usage in Infra (e.g., `pg-event-store.ts`)

```ts
import { log } from '../../core/contracts';

log()?.error('Failed to insert event', { aggregateId, error });
```

---

The **log level should be defined inside `stdLogger`**, driven by an environment variable (e.g. `LOG_LEVEL`), and parsed early using `dotenv`. That keeps configuration centralized and avoids polluting your core with env concerns.

---

### `.env` addition

```env
LOG_LEVEL=debug
```

Available levels (with Pino defaults):

* `fatal`
* `error`
* `warn`
* `info` (default)
* `debug`
* `trace`
* `silent`

---

## Consequences

* **Determinism preserved:** Core code remains side-effect free and testable.
* **Infra owns logging implementation:** Swappable at the adapter level (e.g., Pino → Winston).
* **Scoped context support:** Enables per-command/workflow metadata via `.child()` if needed.
* **Compatible with Docker/Kubernetes log forwarding** via stdout/stderr.
* **Ready for observability stacks:** FluentBit, OpenTelemetry, Loki, etc.
