# CLI Tools and Automation

Intent includes a suite of command-line tools to streamline development, maintain consistency, and enforce best practices. These tools, located in `src/tools/`, help manage the system's schema, policies, and overall code quality.

## Setup Tool

The Setup Tool is an interactive CLI for setting up and configuring infrastructure components like the event store, database schemas, and RLS policies.

### Key Features

- Modular architecture with pluggable flows and providers
- Interactive and non-interactive modes
- Configurable steps for each flow
- Support for multiple providers (e.g., PostgreSQL)
- Environment variable management

### Usage

```bash
# Run a flow with default options
npm run setup -- <flow-name>

# Run a flow with a specific provider
npm run setup -- <flow-name> --provider <provider-name>

# Run a flow with a specific path
npm run setup -- <flow-name> --path <path-name>

# Run a flow with automatic confirmation (no prompts)
npm run setup -- <flow-name> --yes

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

Instead of manual SQL or console steps, developers can run `npm run setup eventstore` to perform initial project bootstrap or CI environment setup.

## Projection Drift Check Tool

The Projection Drift Check Tool detects schema drift between projection definitions in code and actual database tables.

### What It Checks

- Missing columns in the database
- Extra columns in the database
- Case or underscore inconsistencies between code and database

### Usage

```bash
# Run the drift check
npm run tool:projection-check-drift

# Output the report to a file
npm run tool:projection-check-drift -- --out=drift-report.json
```

This tool scans the `ProjectionDefinition` metadata vs. the actual DB tables and warns if there's a mismatch, helping maintain consistency when projections evolve.

## Projection Repair Tool

The Projection Repair Tool builds on drift detection to automatically generate SQL migration scripts to fix schema differences.

### Key Features

- Rebuild tables from scratch
- Replay events to update existing tables
- Process only new events since the last checkpoint

### Usage

```bash
# Rebuild a specific table
npm run tool:projection-repair -- --table <table_name>

# Rebuild a specific projection
npm run tool:projection-repair -- --projection <projection_id>

# Rebuild all projections
npm run tool:projection-repair -- --all

# Rebuild only tables with issues from a drift report
npm run tool:projection-repair -- --drift-report <report_file.json>

# Resume mode: only replay events newer than current table state
npm run tool:projection-repair -- --resume --table <table_name>
```

This tool can save time by avoiding manual SQL writing when a projection's shape changes.

## Projection RLS Policy Linter

The Projection RLS Policy Linter checks that every read model (projection) has proper access control defined and that RLS policies cover all roles/columns as expected.

### What It Checks

- Missing SQL enforcement functions
- Empty SQL strings
- Missing tenant isolation
- Condition name mismatches
- Duplicate conditions
- Unused scopes

### Usage

```bash
# Run linter in normal mode
npm run tool:projections-lint

# Run linter in fix mode to generate patch-ready fixes
npm run tool:projections-lint -- --fix
```

This tool ensures no projection is left unprotected, maintaining security across the system.

## Core Domain Linter

The Core Domain Linter verifies core consistency across the domain model.

### What It Checks

1. **Command Payload Routing**: Ensures that all registered commands with a payload schema also declare proper aggregate routing (if not saga-only).

2. **Role Consistency**: Extracts roles from condition functions and compares them against registered roles to identify any unregistered roles being used in access policies.

### Usage

```bash
npm run tool:core-lint
```

This tool catches misconfigurations in the domain code before they become problems at runtime.

## Integration with CI Pipelines

All these tools are integrated into CI pipelines to ensure consistency across the codebase. For example:

```yaml
# Example GitHub Actions workflow steps
- name: Check projection drift
  run: npm run tool:projection-check-drift

- name: Lint RLS policies
  run: npm run tool:projections-lint

- name: Lint core domain
  run: npm run tool:core-lint
```

Failing the linter or drift check will block a build, reinforcing their importance in maintaining system integrity.

## When to Use These Tools

- **Setup Tool**: When setting up a new environment or updating infrastructure
- **Projection Drift Check**: After modifying projection definitions to ensure DB consistency
- **Projection Repair**: When drift is detected and needs to be fixed
- **RLS Policy Linter**: After adding or modifying read models to ensure proper access control
- **Core Domain Linter**: After adding new commands or roles to ensure proper configuration
