1 ‑ High‑level architecture
mermaid
Copy
Edit
flowchart TB
subgraph "Edge / Partykit"
ClientWS["PartySocket (household‑id room)"]
Room["PartyKit Room<br/>(TypeScript)"]
end

    subgraph "Core services"
        PG[(PostgreSQL<br/>events · aggregates · commands)]
        Temporal["Temporal Server"]
        Workers["Temporal Workers"]
    end

    subgraph "React App"
        UI[React Components]
        Cache[(Local Cache)]
    end

    UI <---> Cache
    UI <-- PartySocket --> ClientWS
    ClientWS <--> Room
    Room -- read/write ---> PG
    Room -- start sync ► |if needed| Temporal
    Workers --> PG
    PG -- LISTEN / NOTIFY --> Room
Tenant isolation

Household ID = party.id in Partykit

Every table in Postgres has tenant_id and Row‑Level Security (tenant_id = current_setting('app.tenant_id')).

Temporal workflow ID is prefixed with tenant_id‑commandId so queues stay isolated.

2 ‑ Data model in Postgres
sql
Copy
Edit
-- simplified
CREATE TABLE events (
tenant_id   uuid   NOT NULL,
id          uuid   PRIMARY KEY,
aggregate_id uuid  NOT NULL,
type        text   NOT NULL,
payload     jsonb  NOT NULL,
version     int    NOT NULL,
causation_id uuid  NOT NULL,
correlation_id uuid NOT NULL,
created_at  timestamptz DEFAULT now()
);

CREATE TABLE aggregates (
tenant_id   uuid,
id          uuid,
type        text,
snapshot    jsonb,
version     int,
PRIMARY KEY (tenant_id, id)
);

CREATE TABLE commands (
tenant_id   uuid,
id          uuid PRIMARY KEY,
type        text,
payload     jsonb,
status      text,
created_at  timestamptz DEFAULT now()
);
Tip: Postgres 17’s fail‑over logical replication slots keep LISTEN/NOTIFY and replication working during node promotion. 
PostgreSQL and Databases in general

3 ‑ Command / event contracts
Exactly the interfaces you defined earlier still apply:

ts
Copy
Edit
// unchanged
interface Command<T> { /* … */ }
interface Event<T>   { /* … */ }
Only difference: tenantId moves into both Command.metadata and Event.metadata.

4 ‑ Edge room (Partykit) workflow
ts
Copy
Edit
// partykit/room.ts
import { nanoid } from "nanoid";
import { sql } from "@vercel/postgres";          // use any Postgres client

export default class HouseholdRoom {
// runs when a client connects
onConnect(conn, ctx) {
// store tenant_id in pg GUC for RLS
ctx.pg = sql.with({ tenant_id: ctx.room.id });   // pseudo‑code
}

// client -> server
async onMessage(conn, msg, ctx) {
const command = JSON.parse(msg);
// 1. quick shape validation
if (!command?.uuid) return conn.send(JSON.stringify({error: "bad"}));

    // 2. write command row (status=pending)
    await ctx.pg`
      INSERT INTO commands
      (tenant_id,id,type,payload,status)
      VALUES (${ctx.room.id}, ${command.uuid},
              ${command.cmd}, ${command.payload}, 'pending')`;

    // 3. decide sync vs async
    const isAsync = needsWorkflow(command.cmd);
    if (isAsync) {
      // start Temporal workflow
      await temporalClient.workflow.start(workflows[command.cmd], {
        taskQueue: "tenant-"+ctx.room.id,
        workflowId: `${ctx.room.id}-${command.uuid}`,
        args: [command]
      });
      conn.send(JSON.stringify({ack: command.uuid}));
      return;
    }

    // 4. synchronous business logic
    const events = domainHandle(command);
    await appendEvents(ctx.pg, events);
    broadcastEvents(ctx, events);
}

// server push from Postgres -> client
async onStart(ctx) {
// LISTEN to tenant‑specific channel
await ctx.pg`LISTEN events_${ctx.room.id}`;
ctx.pg.on("notification", (n) => {
const event = JSON.parse(n.payload);
ctx.broadcast(JSON.stringify({event}));
});
}
}
Key points

LISTEN / NOTIFY: Each INSERT INTO events also executes
NOTIFY events_${tenant_id}, payload. This pushes fresh events to every edge room.
(If latency matters, use the pg-boss or supavisor fork that keeps a single pool.)

Partykit Storage API can cache small snapshots so late joiners don’t replay the full log. 
🎈 PartyKit Docs

5 ‑ Temporal usage pattern
Use Temporal only for commands that:

call external services (payments, inventory),

need retries / long timers (order ready at 18:30),

span more than a couple of seconds.

A worker flow is unchanged:

ts
Copy
Edit
export async function orderWorkflow(cmd: Command<OrderPayload>) {
await activities.recordCommand(cmd);           // writes to commands table
// … validations …
await appendEvent(eventOrderReceived);
// … timers / activities …
await appendEvent(eventOrderConfirmed);
}
Because workers also write to events, LISTEN/NOTIFY takes care of fanning updates into rooms.

Temporal priorities → create one TaskQueue per priority if you need strict ordering. 
Temporal

6 ‑ React hook
ts
Copy
Edit
import { usePartySocket } from "@partykit/client-react";

export function useOrders(tenantId: string) {
const { socket, room } = usePartySocket(
"orders",
{ roomId: tenantId },          // maps 1‑to‑1 with household
);

const [orders, setOrders] = useState<Order[]>([]);

socket.onmessage = (e) => {
const { event } = JSON.parse(e.data);
if (event) applyEventToState(event, setOrders);
};

const sendCommand = (cmd) => socket.send(JSON.stringify(cmd));

// placeOrder(), cancelOrder() identical to previous example
return { orders, sendCommand };
}
No change to client semantics—just a different transport.

7 ‑ Hosting layout

Component	How to host
Partykit Edge	partykit deploy → Cloudflare Workers / your own Miniflare cluster via Docker.
PostgreSQL	Single cluster (Fly.io Postgres, Aurora Postgres) with logical replication slots for LISTEN/NOTIFY high‑availability. 
Jonathan Katz
Temporal Server	Helm chart on Kubernetes or Temporal Cloud; DB can reuse the same Postgres instance on a separate schema.
React + Vite	Static host anywhere (Cloudflare Pages, S3).
8 ‑ Why this is “simpler”
One realtime layer – Partykit both receives commands and broadcasts events (no separate in‑memory game server).

Only Postgres to operate for persistence; event sourcing via append‑only table + indexes.

Tenant isolation is declarative with Postgres RLS and party.id.

Temporal kept optional—used when you actually need durable orchestration.

TL;DR
Partykit rooms (id = household) + Postgres event table + LISTEN/NOTIFY gives you low‑latency sync and deterministic history with far fewer moving parts. Temporal plugs in only for commands that need retries or multi‑step workflows. Everything is self‑hostable with a single Postgres cluster and a small edge worker deployment.






Sources






You said:
i want a hexagon architecture, meaning my core domain would be able to listen to these events, build its state for each tenant, how we would wire this?


ChatGPT said:

Thought for 15 seconds
Below is a hexagonal / ports‑and‑adapters rewrite that keeps your earlier stack (Partykit + PostgreSQL + Temporal) but makes the core domain completely framework‑free.
The goal: every tenant (household) has a pure‑domain aggregate that listens to events from the outside world, derives state, and emits new domain events—without knowing if they came over WebSocket, NOTIFY, or a Temporal activity.

1 ‑ Hexagon at 10 000 ft
mermaid
Copy
Edit
graph TD
%% Core
subgraph "Domain Core (pure TypeScript)"
OrderAgg[Order Aggregate]
DomainSvc[Domain Service]
end

%% Inbound ports
CmdPort[«in» CommandPort]
EventPort[«in» EventPort]

%% Outbound ports
StorePort[«out» EventStorePort]
JobPort[«out» JobSchedulerPort]
PubPort[«out» EventPublisherPort]

%% Adapters
subgraph "Adapters"
PartyCmd[Partykit Room <br/>Command Adapter]
PgStore[Postgres EventStore Adapter]
PgNotify[Postgres NOTIFY <br/>Listener Adapter]
TemporalJob[Temporal Workflow Adapter]
PartyBroadcast[Partykit Broadcast Adapter]
end

%% wiring
PartyCmd --> CmdPort
PgNotify --> EventPort

CmdPort --> DomainSvc
EventPort --> DomainSvc

DomainSvc --> StorePort
DomainSvc --> JobPort
DomainSvc --> PubPort

StorePort --> PgStore
JobPort --> TemporalJob
PubPort --> PartyBroadcast
The hexagon (Domain Core + ports) does not import Partykit, pg, or Temporal—only its own interfaces.

2 ‑ Ports (interfaces)
ts
Copy
Edit
// core/ports.ts
export interface CommandPort {
dispatch(cmd: Command): Promise<void>;
}

export interface EventPort {
on(event: DomainEvent): Promise<void>;
}

export interface EventStorePort {
append(events: DomainEvent[]): Promise<void>;
load(tenant: UUID, aggregateId: UUID): Promise<DomainEvent[]>;
}

export interface JobSchedulerPort {
schedule(cmd: Command): Promise<void>;
}

export interface EventPublisherPort {
publish(events: DomainEvent[]): Promise<void>;
}
3 ‑ Domain service (application layer)
ts
Copy
Edit
// core/order-service.ts
export class OrderService
implements CommandPort, EventPort {

constructor(
private readonly store: EventStorePort,
private readonly scheduler: JobSchedulerPort,
private readonly publisher: EventPublisherPort,
) {}

/* inbound command */
async dispatch(cmd: Command) {
const agg = await this.hydrate(cmd.tenantId, cmd.payload.orderId);
const newEvents = agg.handle(cmd);
await this.persistAndPublish(newEvents, cmd.tenantId);
}

/* inbound event (e.g. inventoryShortage) */
async on(evt: DomainEvent) {
const agg = await this.hydrate(evt.tenantId, evt.aggregateId);
const followUps = agg.apply(evt);
await this.persistAndPublish(followUps, evt.tenantId);
}

/* helpers */
private async hydrate(tid: UUID, aid: UUID) {
const history = await this.store.load(tid, aid);
return OrderAggregate.rehydrate(history);
}

private async persistAndPublish(evts: DomainEvent[], tenant: UUID) {
await this.store.append(evts);
await this.publisher.publish(evts);

    // long‑running side‑effects -> Temporal
    evts.filter(e => e.requiresJob)
        .forEach(e => this.scheduler.schedule(toCommand(e, tenant)));
}
}
The aggregate is pure FP/OO:

ts
Copy
Edit
class OrderAggregate {
static rehydrate(history: DomainEvent[]) { /* fold */ }
handle(cmd: Command): DomainEvent[] { /* business rules */ }
apply(evt: DomainEvent): DomainEvent[] { /* reactions */ }
}
4 ‑ Adapters (infrastructure)
4.1 Partykit room → Command Adapter
ts
Copy
Edit
// infra/partykit-command.ts
room.onMessage(async (conn, raw) => {
const cmd: Command = JSON.parse(raw);
await orderService.dispatch(cmd);          // uses CommandPort
conn.send(JSON.stringify({ ack: cmd.id }));
});
4.2 Postgres event store (outbound)
ts
Copy
Edit
// infra/pg-event-store.ts
export class PgEventStore implements EventStorePort {
async append(events: DomainEvent[]) {
await sql`
      INSERT INTO events ${sql(events.map(toRow))}`;
// pg NOTIFY so other adapters get the update
}
async load(tid, aid) {
return sql<
DomainEvent[]>`SELECT * FROM events
                     WHERE tenant_id=${tid} AND aggregate_id=${aid}
                     ORDER BY version`;
}
}
4.3 Postgres NOTIFY → Event Adapter
ts
Copy
Edit
// infra/pg-notify-listener.ts
listener.on('notification', async (n) => {
const evt: DomainEvent = JSON.parse(n.payload!);
await orderService.on(evt);               // uses EventPort
});
4.4 Temporal Workflow Adapter
ts
Copy
Edit
// infra/temporal-scheduler.ts
export class TemporalScheduler implements JobSchedulerPort {
async schedule(cmd: Command) {
await temporal.workflow.start(workflows[cmd.cmd], {
taskQueue: "tenant-"+cmd.tenantId,
workflowId: `${cmd.tenantId}-${cmd.id}`,
args: [cmd]
});
}
}
4.5 Partykit broadcast (outbound)
ts
Copy
Edit
export class PartyPublisher implements EventPublisherPort {
constructor(private room: PartyKitRoom) {}
publish(evts: DomainEvent[]) {
evts.forEach(e => this.room.broadcast(JSON.stringify({ event: e })));
}
}
5 ‑ Boot‑strapping per tenant
ts
Copy
Edit
// bootstrap.ts
const eventStore = new PgEventStore();
const scheduler  = new TemporalScheduler();
function newService(room: PartyKitRoom) {
return new OrderService(
eventStore,
scheduler,
new PartyPublisher(room)
);
}

export default class HouseholdRoom {
onStart(ctx) { ctx.svc = newService(ctx.room); }
onConnect(c, ctx) { /* … use ctx.svc … */ }
onMessage(c, raw, ctx) { ctx.svc.dispatch(JSON.parse(raw)); }
}
Because every Partykit room instance is already keyed by room.id = tenantId, you automatically get dedicated in‑memory projections per household. The service loads past events from Postgres, builds the aggregate, and stays hot for subsequent commands/events.

6 ‑ Why this satisfies hexagon
Core ≠ Adapters Domain code depends on ports only (no Partykit, pg, Temporal).

Replaceable adapters Swap Postgres for EventStoreDB or Partykit for Liveblocks without touching domain logic.

Per‑tenant state is built by the same hydrate() method whether the trigger is a WebSocket command or a NOTIFY event.

The GitHub references below show larger working examples of the same pattern in TypeScript.
GitHub
GitHub

TL;DR
Wrap your pure domain (aggregates + services) in ports. Implement those ports with:

PgEventStore (append / load)

PgNotifyListener (inbound event adapter)

PartykitRoomCommandAdapter (inbound command adapter)

PartyPublisher (outbound event adapter)

TemporalScheduler (outbound job adapter)

Each Partykit room becomes a tiny “shell” around the hexagon for one tenant, keeping your core logic testable and infrastructure‑agnostic.



Sources






You said:
now write a full proposal, step by step. no need to go into infra (ie k8).


ChatGPT said:

Thought for 13 seconds
Proposal – Hexagonal (“Ports & Adapters”) Architecture with Partykit, PostgreSQL & Temporal
This plan shows—step by step—how to build a multi‑tenant system in which:

React ↔ Partykit keeps every client in real‑time sync.

PostgreSQL stores the authoritative event log and aggregate snapshots.

Temporal orchestrates only the commands that need retries, timers, or external I/O.

The core domain (hexagon) remains pure TypeScript, completely ignorant of frameworks.

No runtime‑infrastructure details (K8s, CI/CD, etc.) are covered here.

0. Prerequisites & repo layout
bash
Copy
Edit
/packages
/domain        ← pure hexagon (aggregates, commands, events, ports)
/infra
/pg          ← Postgres adapters
/partykit    ← Partykit rooms + publisher
/temporal    ← workflows & scheduler adapter
/react-client  ← NextJS / Vite app
1. Define contracts once
ts
Copy
Edit
// domain/contracts.ts
export interface Command<T = any> { id: UUID; tenant: UUID; type: string; payload: T; }
export interface Event<T = any>   { id: UUID; tenant: UUID; type: string; payload: T; aggId: UUID; ver: number; }
Add a requiresJob: boolean flag to any event that should trigger a Temporal workflow.

2. Create inbound & outbound ports
ts
Copy
Edit
// domain/ports.ts
export interface CommandPort  { dispatch(cmd: Command): Promise<void>; }
export interface EventPort    { on(evt: Event): Promise<void>; }

export interface EventStorePort  { append(e: Event[]): Promise<void>; load(t: UUID, a: UUID): Promise<Event[]>; }
export interface JobSchedulerPort{ schedule(cmd: Command): Promise<void>; }
export interface EventPublisherPort { publish(e: Event[]): Promise<void>; }
3. Implement core aggregates & services
ts
Copy
Edit
// domain/order.aggregate.ts
export class Order {
static rehydrate(history: Event[]) { /* fold */ }
handle(cmd: Command): Event[] { /* rules -> new events */ }
apply(evt: Event): Event[]  { /* reactions -> follow‑up events */ }
}

// domain/order.service.ts
export class OrderService implements CommandPort, EventPort { /* see previous answer */ }
The hexagon now compiles with zero runtime dependencies.

4. Set up the Postgres event store
sql
Copy
Edit
CREATE TABLE events (
tenant_id uuid,
id uuid primary key,
aggregate_id uuid,
type text,
payload jsonb,
version int,
causation_id uuid,
correlation_id uuid,
created_at timestamptz default now()
);
CREATE INDEX ON events (tenant_id, aggregate_id, version);

-- OPTIONAL snapshots
CREATE TABLE aggregates (
tenant_id uuid,
id uuid primary key,
type text,
snapshot jsonb,
version int
);
Each INSERT also fires
NOTIFY events_${tenant_id}, json_build_object(...).

5. Adapters
5.1 PgEventStore (implements EventStorePort)
ts
Copy
Edit
export class PgEventStore { /* append & load using tenant_id RLS */ }
5.2 PgNotifyListener (implements EventPort)
Connects to Postgres, listens on events_${tenant}, and forwards each event to the domain service.

5.3 Partykit Room – Command adapter & publisher
ts
Copy
Edit
// infra/partykit/orders.room.ts
import { Party } from "partykit";
import { z } from "zod";

export default class OrdersRoom implements Party.Server {
constructor(readonly room: Party.Room) {}

onStart(ctx) {
ctx.service = buildService(this.room.id, this.room); // bootstrap (Step 6)
}

onMessage(conn, raw, ctx) {
const cmd = z.any().parse(JSON.parse(raw));            // validate inputs :contentReference[oaicite:0]{index=0}
ctx.service.dispatch(cmd);
}
}
PartyPublisher broadcasts domain events to all WebSocket clients in the room. Partykit rooms are already keyed by room.id, so each tenant gets its own in‑memory projection. 
🎈 PartyKit Docs
🎈 PartyKit Docs

5.4 TemporalScheduler (implements JobSchedulerPort)
Starts a workflow whose workflowId is ${tenant}-${command.id}.

6. Composition root per tenant
ts
Copy
Edit
function buildService(tenantId: UUID, room: Party.Room) {
const store = new PgEventStore();
const scheduler = new TemporalScheduler();
const publisher = new PartyPublisher(room);
const svc = new OrderService(store, scheduler, publisher);

// attach Postgres event listener
new PgNotifyListener(tenantId, evt => svc.on(evt));

return svc;
}
7. React client (quick outline)
ts
Copy
Edit
import { usePartySocket } from "partysocket-react";   :contentReference[oaicite:2]{index=2}
const { socket } = usePartySocket("orders", { roomId: tenantId });

socket.onmessage = (e) => { updateLocalState(JSON.parse(e.data).event); };

function putOrder(payload) {
socket.send(JSON.stringify({ id: uuid(), tenant: tenantId, type: "putOrder", payload }));
}
8. Development & testing flow

Level	What to test
Unit	Aggregates: Given history, when command, expect events.
Contract	Each adapter vs its port (e.g., PgEventStore append → load round‑trip).
Integration	Spin up Partykit room + Postgres (Docker). Issue command → assert projection & WebSocket broadcast.
E2E	Browser automation: user A places order, user B sees update.