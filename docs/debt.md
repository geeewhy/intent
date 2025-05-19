# Debt Account
* lack of central registry for projection definitions causing glob searches, bleeds into other tools
    * src/tools/repair-projection-drift.ts
    * src/tools/check-projection-drift.ts
    * src/infra/projections/loadProjections.ts
    * find other occurrences
* normalize "aggregateId" "aggregate_id" in cmds and events, prone to typos/errs
  * src/tools/repair-projection-drift.ts
  * find other occurrences
* Rename libs to be kebab case in infra
  * src/infra/projections/genRlsSql.ts -> src/infra/projections/gen-rls-sql.ts
  * src/infra/projections/loadProjections.ts -> src/infra/projections/load-projections.ts
  * find other occurrences
* Re-do tools README.md
* Separate core schema
  * core to be used for: events, commands, aggregates
  * public to be used for: projections
