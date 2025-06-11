# Core Linting Tool

A utility for validating the consistency of core domain components in the codebase.

## Usage

Run the linter with:

```bash
npm run tool:core-lint
```

## What It Checks

The core linter performs the following validations:

1. **Command Payload Routing**: Ensures that all registered commands with a payload schema also declare proper aggregate routing (if not saga-only).

2. **Role Consistency**: Extracts roles from condition functions and compares them against registered roles to identify any unregistered roles being used in access policies.

## Output

When all checks pass:
```
✅ All core linting checks passed.
```

When issues are found:
```
❌ Core linting found issues:
- Command type 'domain.command' has a payloadSchema but no aggregateRouting
- Domain 'domain' uses unregistered roles: role1, role2
```

## Integration

This tool is integrated into the CI pipeline to ensure code quality and consistency across the codebase.
