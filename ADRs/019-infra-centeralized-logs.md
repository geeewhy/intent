# ADR-019: Centralized Logging Port Across Core and Infra

## What

Introduce a unified logging system using a `LoggerPort` interface, accessible from core and infra layers through a runtime-scoped accessor (`log()`). The logging implementation (e.g. Pino) is bound at runtime via worker bootstrap. This preserves deterministic, testable core logic while enabling structured, contextual logging across the stack.

## Why

Scattered use of `console.log` impedes log structure, tenant correlation, log level control, and downstream observability. Core code should remain pure and optionally log without runtime coupling. By deferring logging to runtime adapters and using a shared `LoggerPort`, logs can be standardized, test-muted, and production-ready—without polluting core logic or introducing direct dependencies.

## Implications

* All log calls in core use `log()?.info(...)` style, making them optional and side-effect free.
* Logging can be toggled or mocked in tests without modifying business logic.
* Logs are scoped, structured, and leveled via a central adapter (`stdLogger`).
* The log level is controlled via `LOG_LEVEL` in `.env`, parsed at startup via `dotenv`.
* Temporal workers bind the logger using `setLoggerAccessor()` during bootstrap.
* The same logger infrastructure can be extended for workflow-specific context (`.child()`), tracing, or log streaming later.

## How

* Define `LoggerPort` with `info`, `warn`, `error`, `debug` methods in `src/core/ports.ts`.
* Add `setLoggerAccessor()` and `log()` accessors to `src/core/contracts.ts`.
* Implement a Pino-backed `stdLogger` adapter in `src/infra/logger/stdLogger.ts`.
* Bind `stdLogger` at worker startup by calling `setLoggerAccessor(() => stdLogger)`.
* Use `log()?.<level>()` anywhere in core or infra to log messages with optional context.
* Configure log verbosity in `.env` using `LOG_LEVEL=debug` or other supported levels.

## Alternatives Considered

* Injecting logger directly into every core module: rejected for violating determinism and adding coupling.
* Global logger singleton: rejected due to tight runtime binding and poor test isolation.
* Keeping `console.log`: rejected due to lack of structure, log levels, and forward compatibility.

## Result

The logging system is now pluggable, deterministic, and environment-configurable. Core logic is pure and optionally observable. Logs are structured, contextual, and stream-ready for CI/CD, Docker, and Kubernetes environments. This foundation supports future tracing and log enrichment with minimal disruption to core code.
