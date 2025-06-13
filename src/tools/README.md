# Tools

This directory contains various tools for managing and configuring the platform.

## Backend Tools

| Tool                                                             | Description                                                                                 |
|------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| [Setup Tool](setup/README.md)                                    | Setup CLI for managing and configuring infrastructure.                                      |
| [Projection Drift Check Tool](projections-drift-check/README.md) | Checks for drift between projection definitions in code and actual database tables.         |
| [Projection Repair Tool](projections-repair/README.md)           | Repairs drift between projection definitions in code and actual database tables.            |
| [Projection RLS Policy Linter](projections-lint/README.md)       | Validates the structure, completeness, and correctness of all ReadAccessPolicy definitions. |
| [Core Domain Linter](core-lint/README.md)                        | Validates that all commands declare routing, and all role-based policies register their required roles. |

## DevX-UI

In addition to the backend tools, we provide a Developer Experience UI (DevX-UI) for simulating and inspecting event-sourced systems. The DevX-UI is located in the `devex-ui` directory at the root of the project.

### DevX-UI Features

- Command issuer to test your flows
- Event stream viewer with filtering and live updates
- Trace viewer for causation and correlation flows
- System metrics panel (commands, events, traces, etc.)
- Multi-tenant and role context switching
- Realtime logs on your ops
- Mock API layer for testing

For more information, see the [DevX-UI README](../../devex-ui/README.md).

## Usage

Each tool has its own README with detailed usage instructions. Click on the tool name in the table above to view its documentation.
