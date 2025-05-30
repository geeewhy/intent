# ADR-019: Modular Infrastructure Setup CLI with Flow Engine & Provider Artifacts

## Context / Problem

* We need a **single developer tool** that can bootstrap or evolve distinct slices of infrastructure (event store, scheduler, projections, …) without duplicating scripts.
* Future targets (e.g., MySQL, ClickHouse, alternative schedulers) must plug-in **without editing core code**.
* Operators should be able to run *different execution paths* for the same slice (initial bootstrap vs. upgrade, etc.).
* The tool must work non-interactively (CI) **and** interactively (local wizard).
* We standardise on

    * **commander** ⇒ CLI surface
    * **prompts** ⇒ interactive selection
    * **zod** ⇒ input validation
    * **pg + Umzug** for first and only steps implementation (PostgreSQL) but abstracted behind providers.

---

## Decision

### 1 · CLI entry (`setup.ts`)

* Uses **commander** to register one sub-command per *flow* (`eventstore`, `scheduler`, `projections`).
* Global flags on every sub-command

    * `--provider <name>` – override provider folder
    * `--path <name>` – choose execution path from YAML
    * `-i, --interactive` – prompt for missing choices
* If required flags are missing **and** `--interactive` is **absent**, the sub-command prints `--help` and exits with `1`.

### 2 · Flow metadata (`flow.yaml`)

```yaml
defaultProvider: postgres
paths:
  initial:
    description: Fresh bootstrap of event store
    steps: [01-db, 02-schema, 03-test]
  upgrade:
    description: Apply migrations on existing store
    steps: [02-schema, 03-test]
```

* Each *path* names a **step list** (filenames, no extension).
* A flow may expose any number of paths; the first becomes the implicit default when running non-interactive with no `--path`.

### 3 · Directory layout

```text
src/tools/setup/
├── setup.ts                   * CLI entry (commander)
├── flows/
│   ├── index.ts               * enumerates available flows
│   ├── loader.ts              * reads flow.yaml, resolves (provider,path) → steps
│   ├── runner.ts              * executes ordered steps
│   ├── eventstore/
│   │   ├── flow.yaml          * defaultProvider + paths{}
│   │   └── providers/
│   │       └── postgres/
│   │           ├── tests/ step/path tests
│   │           ├── artifacts/
│   │           │   ├── migrations/
│   │           │   │   ├── 001_init.sql
│   │           │   │   └── 002_add_snapshot.sql
│   │           │   └── templates/
│   │           │       └── postgres.env_template
│   │           └── steps/
│   │               ├── 01-db.ts
│   │               ├── 02-schema.ts
│   │               └── 03-test.ts
│   ├── scheduler/
│   │   ├── flow.yaml
│   │   └── providers/
│   │       └── temporal/
│   │           ├── artifacts/…
│   │           └── steps/…
│   └── projections/
│       ├── flow.yaml
│       └── providers/
│           └── postgres/
│               ├── artifacts/
│               │   └── migrations/*.sql
│               └── steps/…
└── shared/
    ├── logger.ts
    ├── prompt.ts
    ├── validation.ts
    └── types.ts
└── tests/ top level tests for flows
```

## Tests:

### Starter GWT-style Jest tests

Create the following files under `tests/flows/eventstore/`.

```
tests/
└── flows/
    └── eventstore/
        ├── initial.loader.spec.ts
        ├── initial.runner.spec.ts
        └── initial.integration.spec.ts
```

---

#### 1 `initial.loader.spec.ts`

```ts
/**
 * GIVEN the event-store flow, defaultProvider postgres and the
 * “initial” path declared in flow.yaml
 * WHEN loadFlow is invoked with no CLI overrides
 * THEN it should
 *   – resolve provider === 'postgres'
 *   – resolve pathName  === 'initial'
 *   – return exactly the three expected step files in order
 */
import path from 'node:path'
import { loadFlow } from '../../../src/tools/setup/flows/loader'

describe('loader – eventstore initial', () => {
  const flowName = 'eventstore'
  const root     = path.join(__dirname, '../../../../src/tools/setup/flows')

  it('picks default provider and path', async () => {
    const result = await loadFlow(flowName, { })          // no flags
    expect(result.provider).toBe('postgres')
    expect(result.pathName).toBe('initial')

    const expected = [
      '01-db.ts',
      '02-schema.ts',
      '03-test.ts'
    ].map(f => path.join(root, flowName,
                         'providers/postgres/steps', f))

    expect(result.stepPaths).toEqual(expected)
  })
})
```

---

#### 2 `initial.runner.spec.ts`

```ts
/**
 * GIVEN a resolved step list for the flow
 * WHEN runner.runFlow executes
 * THEN each step is invoked once, in declared order,
 *      and the flow logger records the same sequence.
 * The test replaces real steps with Jest spies; no DB needed.
 */
import path from 'node:path'
import { runFlow } from '../../../src/tools/setup/flows/runner'

jest.mock(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/01-db',
  () => ({ default: jest.fn(async () => {}) })
)
jest.mock(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/02-schema',
  () => ({ default: jest.fn(async () => {}) })
)
jest.mock(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/03-test',
  () => ({ default: jest.fn(async () => {}) })
)

const step1 = require(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/01-db'
).default
const step2 = require(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/02-schema'
).default
const step3 = require(
  '../../../src/tools/setup/flows/eventstore/providers/postgres/steps/03-test'
).default

describe('runner – eventstore initial', () => {
  it('executes steps in order', async () => {
    await runFlow('eventstore', { path: 'initial', provider: 'postgres' })

    expect(step1).toHaveBeenCalledTimes(1)
    expect(step2).toHaveBeenCalledTimes(1)
    expect(step3).toHaveBeenCalledTimes(1)

    // order assertion
    const order = [
      step1.mock.invocationCallOrder[0],
      step2.mock.invocationCallOrder[0],
      step3.mock.invocationCallOrder[0]
    ]
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})
```

---

#### 3 `initial.integration.spec.ts`

```ts
/**
 * GIVEN a disposable Postgres instance (testcontainers)
 * WHEN the event-store “initial” flow runs end-to-end
 * THEN
 *   – migrations finish with zero errors
 *   – a smoke event can be written and read back intact
 */
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { runFlow } from '../../../src/tools/setup/flows/runner'
import pg from 'pg'

jest.setTimeout(60_000)

describe('integration – eventstore initial', () => {
  let container: PostgreSqlContainer
  let pool: pg.Pool

  beforeAll(async () => {
    container = await new PostgreSqlContainer().withDatabase('testdb').start()
    process.env.LOCAL_DB_HOST     = container.getHost()
    process.env.LOCAL_DB_PORT     = String(container.getPort())
    process.env.LOCAL_DB_USER     = container.getUsername()
    process.env.LOCAL_DB_PASSWORD = container.getPassword()
    process.env.LOCAL_DB_NAME     = container.getDatabase()
    pool = new pg.Pool({
      host: process.env.LOCAL_DB_HOST,
      port: Number(process.env.LOCAL_DB_PORT),
      user: process.env.LOCAL_DB_USER,
      password: process.env.LOCAL_DB_PASSWORD,
      database: process.env.LOCAL_DB_NAME
    })
  })

  afterAll(async () => {
    await pool.end()
    await container.stop()
  })

  it('migrates schema and performs smoke RW', async () => {
    // WHEN
    await runFlow('eventstore', { provider: 'postgres', path: 'initial' })

    // THEN : verify table exists
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'events'
    `)
    expect(rows.length).toBe(1)

    // simple smoke write / read
    await pool.query(`INSERT INTO events(id, payload) VALUES ($1,$2)`, ['evt-1', { ok: true }])
    const out = await pool.query(`SELECT payload FROM events WHERE id = $1`, ['evt-1'])
    expect(out.rows[0].payload.ok).toBe(true)
  })
})
```

---

### Running the suite

```bash
# package.json (excerpt)
"scripts": {
  "test:tools:setup"
}
```

* Follow same conventions as other tests: `npm run test:core` and `npm run test:integrations` to run the suite. jest test file will reside under `src/tools/setup/jest.config` , and will be defined in `src/jest.config.js`.
* `initial.loader.test.ts` stays fast and hermetic.
* `initial.runner.test.ts` verifies orchestration logic without external dependencies.
* `initial.integration.test.ts` spins a real Postgres container, proving migrations and smoke logic truly work.

This trio gives immediate safety nets while leaving plenty of room to add further “Given – When – Then” examples for other paths or providers.


### 4 · Flow resolution

1. **`loader.ts`**

    * Reads `<flow>/flow.yaml`.
    * Lists available providers (`providers/*`).
    * Chooses provider & path by precedence: CLI flag → interactive prompt → defaults.
    * Returns absolute paths to step modules and the provider’s `artifacts/` root.

2. **`runner.ts`**

    * Instantiates a `FlowCtx`

      ```ts
      interface FlowCtx {
        vars: Record<string, unknown>
        provider: string
        pathName: string
        artifactsDir: string
        logger: Logger
      }
      ```
    * Imports each step (`default export async (ctx) => …`) and executes sequentially.
    * Logs progress and exits non-zero on first thrown error.

### 5 · Provider isolation

* All provider-specific logic lives under `flows/<flow>/providers/<provider>/`.
* Steps read migrations, templates, or any helper files **relative to `ctx.artifactsDir`** – no hard-coded paths.
* Adding *mysql* for eventstore requires only

    * `providers/mysql/artifacts/*`
    * `providers/mysql/steps/*.ts`
    * optional driver libs – no edits to CLI, loader or runner.

### 6 · Validation & prompts

* **zod** schemas live in `shared/validation.ts` for reusable pieces (e.g., Postgres DSN).
* `shared/prompt.ts` wraps **prompts** with `promptSelect`, `promptYesNo`, `promptText` helpers.

---

## Consequences

* **Modularity** – each flow & provider is self-contained; core code is flow-agnostic.
* **Extensibility** – new infra areas or DBs drop in via folders + YAML; no switch statements.
* **CI compatibility** – pass `--provider` and `--path` flags to skip interactivity.
* **User experience** – `setup <flow> --help` lists concrete provider/path choices derived at runtime.
* **Discoverability** – migrations and env templates bundled under `artifacts/`, version-controlled alongside the steps that use them.
* **Slight complexity** – loader adds indirection (YAML + dynamic imports), but pays for itself by avoiding future rewrites.

---

## Alternatives considered

* **Single flat CLI with hard-coded flags** – fast initially, inflexible when adding flows or providers.
* **Nx/Make targets per environment** – scatters scripts; offers no interactive wizard or reusable validation.
* **One-off npm scripts per provider** – duplicates logic; poor central discoverability.

The chosen design maximises long-term extensibility with minimal ceremony.

---

## Appendix A – Sample Step Skeleton

```ts
// flows/eventstore/providers/postgres/steps/02-schema.ts
import { FlowCtx } from '../../../../../../shared/types.js'
import path from 'node:path'
import { Umzug } from 'umzug'

export default async function step(ctx: FlowCtx) {
  const migDir = path.join(ctx.artifactsDir, 'migrations')
  // initialise Umzug with ctx.vars.pool (created in 01-db)
  // run pending migrations, log via ctx.logger
}
```

---

## Appendix B – Sample Env Template

```
LOCAL_DB_HOST={{LOCAL_DB_HOST}}
LOCAL_DB_PORT=5432
LOCAL_DB_USER={{LOCAL_DB_USER}}
LOCAL_DB_PASSWORD={{LOCAL_DB_PASSWORD}}
LOCAL_DB_NAME={{LOCAL_DB_NAME}}
```

Placeholders are substituted by a dedicated step or by `scaffold-config` logic when invoked inside a flow.