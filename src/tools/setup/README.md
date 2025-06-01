# Tools Index

This directory contains various tools for managing and configuring the backend services.

## Available Tools

- [Setup Tool](../setup/README.md) - A modular infrastructure setup CLI for managing and configuring backend services
- [Projection Drift Check Tool](../projections-drift-check/README.md) - Checks for drift between projection definitions in code and actual database tables
- [Projection Repair Tool](../projections-repair/README.md) - Repairs drift between projection definitions in code and actual database tables

## Setup Tool

A modular infrastructure setup CLI for managing and configuring backend services.

### Overview

The Setup Tool provides a flexible and extensible way to manage infrastructure components through a command-line interface. It's designed around the concept of "flows" - sequences of steps that perform specific infrastructure tasks.

Key features:
- Modular architecture with pluggable flows and providers
- Interactive and non-interactive modes
- Configurable steps for each flow
- Support for multiple providers (e.g., PostgreSQL, MySQL)
- Environment variable management

## Architecture

The tool is organized into the following components:

### Flows

Flows are sequences of steps that accomplish a specific infrastructure task. Each flow is defined in a `flow.yaml` file that specifies:
- Available execution paths
- Default provider
- Description
- Steps to execute for each path

### Providers

Providers are implementations for specific technologies (e.g., PostgreSQL, MySQL). Each flow can have multiple providers, allowing the same logical flow to be executed against different technologies.

### Steps

Steps are individual operations within a flow. Each step is a TypeScript module that exports a default async function which receives a context object.

## Usage

### Basic Usage

```bash
# Run a flow with default options
npm run setup -- <flow-name>

# Run a flow with a specific provider
npm run setup -- <flow-name> --provider <provider-name>

# Run a flow with a specific path
npm run setup -- <flow-name> --path <path-name>

# Run a flow with automatic confirmation (no prompts)
npm run setup -- <flow-name> --yes
```

### Interactive Mode

```bash
# Start interactive mode
npm run setup -- interactive
# or
npm run setup -- i
```

### Available Flows

- **eventstore**: Setup and manage event store infrastructure
  - `initial`: Fresh bootstrap of event store
  - `upgrade`: Apply migrations on existing store
  - `test`: Run tests on existing store

## Development

### Creating a New Flow

1. Create a new directory under `src/tools/setup/flows/<flow-name>`
2. Create a `flow.yaml` file with the flow configuration
3. Create provider implementations under `providers/<provider-name>`
4. Implement steps as TypeScript modules under `providers/<provider-name>/steps`

### Flow Configuration (flow.yaml)

```yaml
# Default provider to use if not specified
defaultProvider: postgres

# Description of the flow
description: Setup and manage infrastructure

# Available paths for this flow
paths:
  initial:
    description: Fresh bootstrap
    steps: [step1, step2, step3]
  upgrade:
    description: Apply migrations
    steps: [step1, step3]
```

### Step Implementation

```typescript
import { FlowCtx } from '../../../../../shared/types';

export default async function step(ctx: FlowCtx): Promise<void> {
  ctx.logger.info('Executing step');

  // Step implementation
  // ...

  // Store data in context for other steps
  ctx.vars.myData = 'some value';
}
```

## Environment Variables

The tool can generate environment files based on templates. For PostgreSQL connections, it uses:

- `LOCAL_DB_HOST`: Database host
- `LOCAL_DB_PORT`: Database port
- `LOCAL_DB_USER`: Database user
- `LOCAL_DB_PASSWORD`: Database password
- `LOCAL_DB_NAME`: Database name

## Error Handling

The tool provides comprehensive error handling and logging. When a step fails, the entire flow is aborted and an error message is displayed.

To enable debug logging, set the `DEBUG` environment variable:

```bash
DEBUG=1 npm run setup -- <flow-name>
```
