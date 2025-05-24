# Debt Account

This file is a work-in-progress. It is not a complete list of all the debt in the project, but it is a starting point for tracking and managing technical debt.

### Outstanding Technical Debt

| Cost                                         | Item                                         | Notes                                                                                                                                          | Considerations                                                                                                          |
|----------------------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------| ----------------------------------------------------------------------------------------------------------------------- |
| **high**: snapshot can drift                 | **Make snapshots atomic**                    | fold snapshot logic into append                                                                                                                | • Introduce domain-based or feature subfolders (e.g., `tools/migrations`, `tools/projections`).<br>• Add a README per folder to explain purpose and usage.<br>• Move gradually—start with least-used scripts to minimise merge conflicts.<br>• Enforce structure via CI lint to prevent regressions. |
| **Mid**: flat tool layout scales poorly      | **Tooling layout unstructured**              | All helper scripts live in a single `tools/` root.                                                                                             | • Introduce domain-based or feature subfolders (e.g., `tools/migrations`, `tools/projections`).<br>• Add a README per folder to explain purpose and usage.<br>• Move gradually—start with least-used scripts to minimise merge conflicts.<br>• Enforce structure via CI lint to prevent regressions. |
| **Low**: contained to tooling, easy refactor | **Projection registry missing**              | Glob searches in `repair-projection-drift.ts`, `check-projection-drift.ts`, `loadProjections.ts`, etc. leak projection knowledge into scripts. | • Central registry would remove brittle globbing.<br>• Refactor scripts incrementally; no production downtime expected. |
| **Low**: wrappers already shield runtime     | **`aggregateId` vs `aggregate_id` mismatch** | Mixed casing in commands/events introduces typo risk and extra mapping code.                                                                   | • Agree on single casing (prefer camelCase) and run codemod.<br>• Remove translation wrappers once cleaned.             |
| **Low**: cosmetic, migration straightforward | **Schema & file naming inconsistencies**     | DB column `aggregate_id` vs code `aggregateId`; helper filenames not kebab-case.                                                               | • Rename column via online migration; update queries.<br>• Align filenames for grepability and convention.              |
| **Low**: purely documentation                | **Outdated tooling docs**                    | `tools/README.md` no longer matches current scripts or flags.                                                                                  | • Rewrite README with up-to-date commands and examples.<br>• Add doc-lint step to CI to catch future drift.             |


# Paid
* Separate core schema
  * core to be used for: events, commands, aggregates
  * public to be used for: projections
