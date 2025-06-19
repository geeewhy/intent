# Tools

This directory contains tools for managing infrastructure, enforcing consistency, and improving developer experience across the Intent platform.

## Backend Utilities

These tools help you manage event-sourced infrastructure, detect and fix projection issues, and enforce access policies in CI.

| Tool                                                             | Purpose                                                                                     |
|------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| [Setup Tool](setup/README.md)                                    | Bootstrap or update your event store and infrastructure with a modular CLI.                |
| [Projection Drift Checker](projections-drift-check/README.md)    | Detect mismatches between projection definitions and actual database schemas.              |
| [Projection Drift Repairer](projections-repair/README.md)        | Auto-generate fixes for schema drift without nuking production tables.                     |
| [RLS Policy Linter](projections-lint/README.md)                  | Ensure all projections define valid ReadAccessPolicies with no missing roles or coverage.  |
| [Core Domain Linter](core-lint/README.md)                         | Validate that all commands are routable and role policies register the roles they require. |

Each tool has its own README with usage examples and integration notes.

## DevX-UI

In addition to CLI tools, Intent includes a **Developer Experience UI (DevX-UI)** for inspecting and simulating your event-sourced system. It lives in the `devex-ui` directory at the project root.

### Key Features

- Command issuer to test command handling and trace event flow
- Live event stream viewer with filtering
- Trace viewer showing correlation and causation paths
- System-level metrics: events, commands, traces, workflows
- Tenant and role simulation with context switching
- Realtime logs on command execution and projection updates
- Built-in mock API mode for demoing without backend dependencies

See [DevX-UI README](../../devex-ui/README.md) for setup instructions.

## How to Use These Tools

Each tool runs independently and has its own CLI entrypoint.  
For help, usage examples, and CI integration tips, see the linked READMEs above.