# ADR-014: Projection Schema Drift Detection and Management

## Context

In our event-sourced architecture, read models (projections) are built by applying events to Postgres tables via code in `src/core/**/read-models/*` and upserted using helpers in `src/infra/projections/pg-updater.ts`.
**Schema drift** can occur when the shape of these tables no longer matches the data written by projection logic, leading to silent errors, projection failures, or business logic bugs.

---

## Problem

* **Drift between the code’s expected columns and the actual DB schema** is hard to spot until failures.
* Causes include refactors, manual DB changes, missing migrations, or event evolution.
* Silent drift risks: incorrect data, failed upserts, unprotected RLS, and broken business logic.

---

## Types of Schema Drift

| Type                | Example                                          | Detection                        |
| ------------------- | ------------------------------------------------ | -------------------------------- |
| **Missing columns** | `parameters` removed from DB but still projected | Code vs. `information_schema`    |
| **Extra columns**   | Table has `foo`, but projection never writes it  | Static/code diff or runtime logs |
| **Type mismatch**   | Table column `numberExecutedTests` is `text`     | Code/type annotation vs. DB type |
| **Field drift**     | `tester_id` vs `testerId` (case/underscore)      | Key diff and case/format check   |
| **Enum/semantic**   | Domain enum changes without DB update            | Test harness, event replay fail  |

---

## Solution: Static Drift Detection Tool

### Approach

Build a script:
**`src/tools/check-projection-drift.ts`**

#### What it does:

* Loads all projection handlers via `loadAllProjections` (see `src/infra/projections/loadProjections.ts`)
* Gets the **expected data keys** for each projection (from code or a static export)
* Fetches **actual table columns** from Postgres via `information_schema.columns`
* Diffs keys and types
* Warns on missing/extra/type-mismatched columns
* Exits nonzero on critical errors

---

## Implementation Plan

### 1. **Define expected keys per projection**

In each projection file, e.g. `system-status.projection.ts`:

```ts
// Add this at the top or export
export const systemStatusProjectionColumns = [
  'id', 'tenant_id', 'testerId', 'testName', 'result',
  'executedAt', 'parameters', 'numberExecutedTests', 'updated_at'
];
```

*Reference: `src/core/system/read-models/system-status.projection.ts`*

---

### 2. **Drift checker script**

**File:** `src/tools/check-projection-drift.ts`

**Main logic:**

* For each projection, fetch the table structure using:

  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = $1;
  ```
* Compare with the `projectionColumns` export.
* Warn if:

    * Columns in projection but not in table (missing in DB)
    * Columns in table but not projected (unused/obsolete)
    * Type mismatches
    * Naming or case mismatches

**Example warning:**

```
[SCHEMA DRIFT] Column 'testerId' is projected but missing in table 'system_status'
[SCHEMA DRIFT] Column 'updated_at' is type 'timestamp' in DB but projected as 'string'
```

---

### 3. **Test harness for drift enforcement**

**File:** `src/core/system/read-models/__tests__/system-status.projection.drift.test.ts`

* Test loads table columns and compares with `systemStatusProjectionColumns`
* Fails if drift detected (optionally run in CI)

---

### 4. **CI Integration**

* Add to `package.json`:

  ```json
  "scripts": {
    "check:projection-drift": "ts-node src/tools/check-projection-drift.ts"
  }
  ```
* Run in CI/CD and block deploys on schema drift.

---

### 5. **Remediation Process**

If drift is detected, with a separate tool we can;

1. **Mark projection as stale** (e.g. via an annotation or CI fail)
2. **Drop/recreate the affected table** by replaying events
3. **Re-run migrations** to restore schema
4. **Replay events** to rebuild the projection
5. **Rerun RLS policy generator** to enforce correct access

---

## Code Key Points & File References

* **Projection columns export:**
  `src/core/system/read-models/system-status.projection.ts`

* **Read model policy table mapping:**
  `src/core/system/read-models/read-access.ts`

* **Projection runner (event replay):**
  `src/infra/projections/projectEvents.ts`

* **Read model upsert logic:**
  `src/infra/projections/pg-updater.ts`

* **Drift detection tool:**
  `src/tools/check-projection-drift.ts`

---

## Why This Matters

* **Prevents silent bugs and incomplete projections**
* **Keeps read model schema aligned with code and events**
* **Protects RLS policies and data access**
* **Supports safe, event-sourced rebuilding workflows**

---

## Appendix: CLI Output Example

```
$ npm run check:projection-drift

[SCHEMA DRIFT] Column 'parameters' is written by projection but missing in table 'system_status'
[SCHEMA DRIFT] Column 'testName' is present in table 'system_status' but not written by projection
[SCHEMA DRIFT] Type mismatch: 'numberExecutedTests' projected as 'number', in table as 'text'

1 projections checked, 2 warnings, 1 error.
```

## Code example

Here’s a **starter implementation** for your schema drift detection tool.

---

### `src/tools/check-projection-drift.ts`

```ts
#!/usr/bin/env ts-node

/**
 * Projection Schema Drift Checker
 *
 * Validates that the expected columns in each projection match the actual table schema in Postgres.
 * Run: npm run check:projection-drift
 */

import { createPool } from '../infra/projections/pg-pool';
import { loadAllProjections } from '../infra/projections/loadProjections';
import * as path from 'path';

// Manually map projection handler to expected columns export and table
// (Or, add a static property/field to each projection for discoverability)
const projectionMeta = [
  {
    name: 'system-status',
    table: 'system_status',
    columnsExport: 'systemStatusProjectionColumns',
    projectionFile: path.resolve(__dirname, '../core/system/read-models/system-status.projection.ts'),
    // If you want, you can glob and import these dynamically
  },
  // Add more projections here as needed
];

async function getTableColumns(table: string, pool) {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
  `, [table]);
  return result.rows.map(r => ({ column: r.column_name, type: r.data_type }));
}

function compareColumns(expected: string[], actual: {column: string, type: string}[]) {
  const issues: string[] = [];
  const actualCols = actual.map(a => a.column);
  // Missing columns
  for (const col of expected) {
    if (!actualCols.includes(col)) {
      issues.push(`❌ Missing in table: '${col}'`);
    }
  }
  // Extra columns
  for (const { column } of actual) {
    if (!expected.includes(column)) {
      issues.push(`⚠️ Present in table but not projected: '${column}'`);
    }
  }
  return issues;
}

async function checkProjectionSchemaDrift() {
  const pool = createPool();

  let foundDrift = false;

  for (const meta of projectionMeta) {
    // Dynamically import the projection file to get the columns
    let columns: string[] = [];
    try {
      const mod = await import(meta.projectionFile);
      columns = mod[meta.columnsExport];
      if (!Array.isArray(columns) || columns.length === 0) {
        console.warn(`[DRIFT] Unable to find columns export in ${meta.projectionFile}`);
        continue;
      }
    } catch (err) {
      console.error(`[DRIFT] Failed to import columns from ${meta.projectionFile}:`, err);
      continue;
    }

    // Fetch actual table schema
    const actualCols = await getTableColumns(meta.table, pool);
    if (actualCols.length === 0) {
      console.warn(`[DRIFT] Table '${meta.table}' does not exist in DB`);
      continue;
    }

    // Compare
    const issues = compareColumns(columns, actualCols);

    if (issues.length > 0) {
      foundDrift = true;
      console.log(`\n[DRIFT] Projection '${meta.name}' (table '${meta.table}'):\n${issues.map(i => '  ' + i).join('\n')}`);
    } else {
      console.log(`[OK] Projection '${meta.name}' matches table '${meta.table}'`);
    }
  }

  await pool.end();

  if (foundDrift) {
    console.log('\n❌ Projection schema drift detected!');
    process.exit(1);
  } else {
    console.log('\n✅ No schema drift detected. All projections match DB tables.');
  }
}

if (require.main === module) {
  checkProjectionSchemaDrift();
}
```

---

## 📝 **How to Use**

1. **In each projection file, export an array of expected columns:**

   ```ts
   // src/core/system/read-models/system-status.projection.ts
   export const systemStatusProjectionColumns = [
     'id',
     'tenant_id',
     'testerId',
     'testName',
     'result',
     'executedAt',
     'parameters',
     'numberExecutedTests',
     'updated_at',
   ];
   ```

2. **List each projection in `projectionMeta`** at the top of the script, mapping to table name and export.

3. **Add to `package.json`:**

   ```json
   "scripts": {
     "check:projection-drift": "ts-node src/tools/check-projection-drift.ts"
   }
   ```

4. **Run:**

   ```bash
   npm run check:projection-drift
   ```

---

## 🚩 **Result Example**

```
[OK] Projection 'system-status' matches table 'system_status'

✅ No schema drift detected. All projections match DB tables.
```

Or:

```
[DRIFT] Projection 'system-status' (table 'system_status'):
  ❌ Missing in table: 'parameters'
  ⚠️ Present in table but not projected: 'extra_field'

❌ Projection schema drift detected!
```

Add:
* Adding type checks to `compareColumns`
* Auto-discovering projections via glob if your exports are named consistently
* Adding per-domain configs as your system scales
* Enhanced with type checking and auto-discovery
