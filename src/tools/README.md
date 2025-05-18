# RLS Policy Linter

A CLI tool that validates the structure, completeness, and correctness of all `ReadAccessPolicy` definitions across domain read models.

## Usage

```bash
# Run linter in normal mode
npm run lint:rls

# Run linter in fix mode to generate patch-ready fixes
npm run lint:rls -- --fix
```

## What it checks

| Check                                    | Severity | Description                                                 |
| ---------------------------------------- | -------- | ----------------------------------------------------------- |
| Missing `enforcement.sql()`              | Error    | Warns if a policy doesn't define a SQL generator            |
| Empty SQL string                         | Error    | Warns if `sql()` returns an empty or whitespace-only string |
| Missing `tenant_id` scoping              | Error    | Warns if the SQL expression doesn't enforce tenant isolation|
| Condition name mismatch                  | Warning  | Warns if `policy.condition !== scopeName`                   |
| Duplicate `condition` across policies    | Warning  | Warns if multiple policies reuse the same `condition` string|
| Scope defined but unused                 | Warning  | Warns if a scope is defined but not used in any policy      |

## Example output

```
🔍 RLS Policy Linter
====================

Found 1 read-access files

❌ RLS Policy Linter Failed:

🔴 Errors:
  - Missing enforcement.sql in scope: system.read.system_status.own
  - Policy 'system.read.system_status.own' missing tenant_id restriction
    Add tenant_id check like: current_setting('request.jwt.claims', true)::json->>'user_id' = "testerId"::text AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text

🟡 Warnings:
  - Policy condition mismatch: declared 'system.read.system_status.all', scope key is 'SYSTEM_STATUS_ALL'
  - Duplicate policy condition: 'system.read.system_status.own' used in multiple policies

✅ Found 8 total policies, 2 errors, 2 warnings
```

## Exit codes

- `0`: No errors found (warnings may still be present)
- `1`: One or more errors found

## Integration with CI

You can add this linter to your CI pipeline to ensure that all RLS policies are correctly defined:

```yaml
# Example GitHub Actions workflow step
- name: Lint RLS policies
  run: npm run lint:rls
```

## Fix Mode

When run with the `--fix` flag, the linter will generate patch-ready fixes for certain issues:

- Missing tenant_id checks: Adds the appropriate tenant_id check to the SQL condition
- Incorrect table names: Suggests the correct table name based on projection files

### Example Fix Output

```
🔍 RLS Policy Linter
====================

Running in FIX mode - will generate patch-ready fixes

Found 1 read-access files

Found 1 projection tables in src/core/system/read-models

❌ RLS Policy Linter Failed:

🔴 Errors:
  - Table 'system_statusx' in policy 'system.read.system_status.own' not found in any projection file
    Consider changing to 'system_status'

✅ Found 2 total policies, 1 errors, 0 warnings

🔧 Generated fixes:

--- src/core/system/read-models/read-access.ts
+++ src/core/system/read-models/read-access.ts

@@ Fix table name for policy system.read.system_status.own from 'system_statusx' to 'system_status' @@
- table: 'system_statusx'
+ table: 'system_status'

To apply these fixes, you can manually edit the files or use a patch tool.
```

## Future enhancements

- Export audit JSON (e.g. `rls-policy-report.json`)
- Add more checks for policy completeness and correctness
- Add ability to automatically apply fixes with a `--fix-apply` flag
