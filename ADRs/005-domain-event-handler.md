### Routing **events** through a worker-side **Event Bus**

#### 1 Event-pump worker

```ts
// packages/worker/event-pump.ts
import pg from 'pg';
import { EventBus } from './event-bus';          // see §2
import { OrderPM } from '../domain/pms/order.pm';
import { BillingPM } from '../domain/pms/billing.pm';

const bus = new EventBus();
bus.register(new OrderPM(commandBus));          // commandBus already exists
bus.register(new BillingPM(commandBus));

const pgConn = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await pgConn.connect();
await pgConn.query('LISTEN new_event');

pgConn.on('notification', async (n) => {
  const evt: Event = JSON.parse(n.payload!);
  await bus.publish(evt);                       // routing happens here
});
```

---

#### 2 Event Bus (mirror of Command Bus)

```ts
interface EventHandler<E extends Event = Event> {
  supports(e: Event): e is E;
  handle(e: E): Promise<void>;
}

export class EventBus {
  private handlers: EventHandler[] = [];
  register(h: EventHandler) { this.handlers.push(h); }

  async publish(e: Event) {
    await Promise.all(
      this.handlers.filter(h => h.supports(e))
                   .map(h => h.handle(e))
    );
  }
}
```

---

#### 3 Process manager example

```ts
export class OrderPM implements EventHandler<OrderCreatedEvt | OrderReadyEvt> {
  constructor(private commands: CommandBus) {}

  supports(e: Event) {
    return e.type === 'order.created' || e.type === 'order.ready';
  }

  async handle(e: Event) {
    if (e.type === 'order.created') {
      await this.commands.dispatch({
        id: uuid(), tenant_id: e.tenant_id,
        type: 'order.scheduleAutoCancel',
        payload: { orderId: e.aggregateId, delayMin: 15 },
        async: true                       // workflow router will pick this up
      });
    }
    if (e.type === 'order.ready') {
      await this.commands.dispatch({
        id: uuid(), tenant_id: e.tenant_id,
        type: 'billing.createInvoice',
        payload: { orderId: e.aggregateId },
        async: true
      });
    }
  }
}
```

---

#### 4 Publishing events from `OrderService`

```ts
const events = aggregate.handle(cmd);
await eventStore.append(events);      // single commit
/* No direct call to process managers; worker will receive NOTIFY */
await realtimePublisher.publish(events);  // WebSocket fan-out
```

*We* merely persist; the worker guarantees every event is delivered to every interested domain component exactly once.

---

```text
📁 packages/
 └─ infra/
     └─ pump/
        ├─ realtime-pump-base.ts   ← generic plumbing (single source of truth)
        ├─ command-pump.ts         ← config for `commands` stream
        ├─ event-pump.ts           ← config for `events` stream
        └─ helpers/
           ├─ command-helpers.ts
           └─ supabase-client.ts
```

---

## 1 Generic pump (`realtime-pump-base.ts`)

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; dotenv.config();

export interface PumpConfig<Row> {
  /** Supabase channel name */
  channel: string;
  /** postgres_changes filter */
  eventSpec: {
    event: 'INSERT' | 'UPDATE' | 'DELETE';
    schema: string;
    table: string;
    filter?: string;              // e.g. 'status=eq.pending'
  };
  batchSize?: number;             // default 50
  /** fast reject rows we don't want */
  validate: (row: Row) => boolean;
  /** process an **array** of rows (batch) */
  processBatch: (rows: Row[]) => Promise<void>;
}

export class RealtimePumpBase<Row = any> {
  private sb: SupabaseClient;
  private queue: Row[] = [];
  private draining = false;

  constructor(private cfg: PumpConfig<Row>) {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-supabase-auth-role': 'service_role' } },
      realtime: { params: { eventsPerSecond: 20 } }
    });
  }

  /** bootstrap & listen */
  async start() {
    console.log(`[Pump] start ${this.cfg.channel}`);
    await this.sb.channel(this.cfg.channel)
      .on('postgres_changes', this.cfg.eventSpec, ({ new: row }) => {
        if (this.cfg.validate(row)) this.queue.push(row as Row);
      })
      .subscribe((status, err) =>
        console.log(`[Pump] ${this.cfg.channel} status=${status}`, err?.message)
      );
    /* drain loop */
    setInterval(() => this.drain(), 25);     // ~40 Hz
  }

  private async drain() {
    if (this.draining || this.queue.length === 0) return;
    this.draining = true;

    const batchSize = this.cfg.batchSize ?? 50;
    const batch = this.queue.splice(0, batchSize);

    try   { await this.cfg.processBatch(batch); }
    catch (e) { console.error('[Pump] batch error', e); }
    finally { this.draining = false; }
  }
}
```

---

## 2 Shared helpers

```ts
// helpers/supabase-client.ts
import { createClient } from '@supabase/supabase-js';
export const sbAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false, autoRefreshToken:false } }
);

// helpers/command-helpers.ts
import { WorkflowClient } from '@temporalio/client';
import { sbAdmin } from './supabase-client';
import { Command } from '../../../domain/contracts';

const temporal = new WorkflowClient({ address: process.env.TEMPORAL_ADDR! });

export async function scheduleWorkflow(cmd: Command) {
  const wfId = `${cmd.tenant_id}-${cmd.id}`;
  await temporal.signalWithStart('orderSaga',            // or per-type saga
    { workflowId: wfId, taskQueue:`tenant-${cmd.tenant_id}`, args:[cmd] },
    ['externalCommand', cmd]
  );
}

export const markConsumed = (id: string) =>
  sbAdmin.from('commands').update({ status:'consumed' }).eq('id', id);

export const markFailed   = (id: string, err: Error) =>
  sbAdmin.from('commands').update({
    status:'failed', error_message: err.message
  }).eq('id', id);
```

---

## 3 Command pump (`command-pump.ts`)

```ts
import { RealtimePumpBase } from './realtime-pump-base';
import { scheduleWorkflow, markConsumed, markFailed } from './helpers/command-helpers';
import { Command } from '../../domain/contracts';

new RealtimePumpBase<Command>({
  channel   : 'commands-pump',
  eventSpec : {
    event:'INSERT', schema:'public', table:'commands', filter:'status=eq.pending'
  },
  batchSize : 20,
  validate  : c => c && c.status === 'pending' && !!c.type,
  processBatch: async rows => {
    for (const cmd of rows) {
      try   { await scheduleWorkflow(cmd); await markConsumed(cmd.id); }
      catch (e) { await markFailed(cmd.id, e as Error); }
    }
  }
}).start();
```

---

## 4 Event pump (`event-pump.ts`)

```ts
import { RealtimePumpBase } from './realtime-pump-base';
import { Event } from '../../domain/contracts';
import { eventBus } from '../bootstrap-event-bus';   // EventBus instance

new RealtimePumpBase<Event>({
  channel   : 'events-pump',
  eventSpec : { event:'INSERT', schema:'public', table:'events' },
  batchSize : 200,
  validate  : () => true,
  processBatch: rows => eventBus.publishBatch(rows)   // publishBatch performs Promise.all internally
}).start();
```

---

## 5 EventBus with batch helper

```ts
// infra/event-bus.ts
export class EventBus {
  private handlers: EventHandler[] = [];
  register(h: EventHandler) { this.handlers.push(h); }

  async publish(evt: Event) { await this.publishBatch([evt]); }

  async publishBatch(evts: Event[]) {
    for (const e of evts) {
      await Promise.all(
        this.handlers.filter(h => h.supports(e)).map(h => h.handle(e))
      );
    }
  }
}
export const eventBus = new EventBus();
```
