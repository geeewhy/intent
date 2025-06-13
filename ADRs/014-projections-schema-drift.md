# ADR-014: Projection Schema Drift Detection and Management

## What

Introduce static schema drift detection for Postgres-backed projections to ensure read model definitions in code remain aligned with actual database schemas. Each projection exports an array of expected column names, and a CLI tool compares these against `information_schema.columns` to detect discrepancies. Detected drift can block CI and trigger remediation workflows.

## Why

Read models evolve alongside domain events and projection logic. Without static checks, mismatches between code and schema lead to silent projection failures, incorrect data, RLS bypass, or broken business functionality. A simple, auditable tool helps ensure consistency across event evolution, migrations, and refactors—before bugs reach production.

## Implications

* Every projection file must export its expected column list under a known name.
* `check-projection-drift.ts` statically compares these with live DB schemas using Postgres metadata.
* Drift warnings include missing columns, unused table fields, and naming mismatches.
* CI can block deployments on critical drift detection using `npm run check:projection-drift`.
* Projection schema migration is now explicitly verifiable and enforced.
* Drift reports improve maintainability and provide visibility into read model coverage.
* Optional per-slice `.drift.test.ts` files can enforce expectations as part of core test suites.

## How

* Each projection exports an array like `systemStatusProjectionColumns`.
* A tool at `src/tools/check-projection-drift.ts` loads all registered projections and compares exports to `information_schema.columns`.
* Drift is logged as missing/extra/mismatched fields with full table and projection context.
* The CLI tool can be added to `package.json` and invoked during CI pipelines.
* A test wrapper can call the tool per-slice to localize failures.
* Detected drift can trigger a remediation pipeline: replay events, regenerate migrations, and reapply RLS.

## Alternatives Considered

* Runtime upsert validation via query failures: rejected due to noisy failure surfaces and test complexity.
* ORM reflection (e.g., Prisma, TypeORM): rejected in favor of portability and low-level migration control.
* Static code-to-SQL AST parsing: overkill for current scale and unnecessary given live DB access.

## Result

The system now has static drift detection for projection schemas. Each slice owns its expected columns, and any mismatch with the DB schema is reported before production deploys. The projection infrastructure is more observable, auditable, and testable. CI can enforce schema discipline, RLS integrity is protected, and future tooling can leverage this foundation to automate migration validation and rollback detection.
