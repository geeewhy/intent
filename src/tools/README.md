# RLS Policy Linter

A CLI tool that validates the structure, completeness, and correctness of all `ReadAccessPolicy` definitions across domain read models.

## Usage

```bash
npm run lint:rls
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

## Future enhancements

- Export audit JSON (e.g. `rls-policy-report.json`)
- Add more checks for policy completeness and correctness
