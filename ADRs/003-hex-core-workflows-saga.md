# Domain Core Services and Temporal wiring

Workflows will only orchestrate, activities do side-effects. Business flow all in domain layer—makes state-transition rules explicit in core domain code (src/domain).

# Core services wiring

Implement as:

Command arrives
Edge Function /command inserts a row in commands
→ pg_notify('new_command', …) fires.

Command-pump worker
LISTEN new_command → pulls the row → loads OrderService
const events = orderService.dispatch(cmd);   // Aggregate returns [orderCreated]

OrderService (application layer, inside the worker)
// OrderService.dispatch(cmd)  – when called from an activity
const events = aggregate.handle(cmd);
await eventStore.append(events);   // persist
await eventPublisher.publish(events); // WS fan-out

Handling of events:
1 Load history	Domain Service reads past events → Aggregate.rehydrate(events)	Build current state for validation
2 Validate command	Aggregate.handle(cmd) returns newEvents[]	All business rules live in one place
3 Persist	Domain Service appends newEvents to the event store	Makes them durable/visible
4 Apply in-memory	Aggregate.apply(evt) — only after the DB write succeeds	Keeps the long-lived instance current.

In summary:
EdgeFn writes command →
pump starts/ signals workflow →
workflow loads aggregate, runs business logic, persists events (via activity calling OrderService) and sets timers / sleeps → .

## Implementation

1. All commands will now go through temporal -- Remove requiresJob flag from events (no longer referenced).
2. Drop JobSchedulerPort from OrderService constructor.
3. Command-pump:
For every new commands row call
start(orderSaga, { workflowId: tenantId+'-'+cmd.id, args:[cmd] }) (or signalWithStart if per-order workflow already exists).
You no longer need logic that decides “Is this command async?”.

# New Clean Core Domain Ports
- CommandStorePort: to issue commands
- EventStorePort: to persist events
- AggregateStorePort: to persist aggregates, save and load snapshots to hydrate aggregates

# Issues with current setup for workflows:

1. Move activity implementations to activities/order.ts. In the workflow file keep only:
export const { notifyUser, … } = proxyActivities<OrderActivities>();
and import types with import type { OrderActivities } from '../activities/order';

2. new Promise(setTimeout) inside workflow	Non-deterministic; timers must use SDK helpers.

3. Replace with import { sleep } from '@temporalio/workflow'; then await sleep(timeUntilScheduled);.

4. Use workflow time to stay replay-safe. ie. import { now } from '@temporalio/workflow'; const scheduled = new Date(cmd.payload.scheduledFor).getTime(); const delta = scheduled - now();

5. Do not return value from workflows - ie. processOrderCreated returns a JSON blob—fine—but remember Temporal will store it in history; keep payloads small.

## 5. Clean up activity code
Currently updateOrderStatusActivity and export a JS function with the same name. Easy to confuse. After splitting files, the duplicate name problem should disappear.

## 6. Connections initializations for activities.
For connections, ensure you initialize the connection once, not per call, for perf.

## 7. No extra wrappers

Currently wrapper workflows (createOrder, updateOrderStatus, …) that just call the “process*” functions. That’s okay but redundant. 
Fix with, either:
• rename the process* functions to createOrderWorkflow etc. and export directly, or
• keep thin wrappers but mark the inner fns private / unexported.

Minimal file split illustration
./worker
order.workflows.ts
order.activities.ts

ie.
// order.workflows.ts   (workflow context only)
import { proxyActivities, sleep, now } from '@temporalio/workflow';
import type { OrderActivities } from './order.activities';

const { notifyUser, updateOrderStatus, scheduleReminder, markCommandAsProcessed } =
proxyActivities<OrderActivities>({ startToCloseTimeout: '1 minute' });

export async function createOrder(cmd: Command) {
// …same logic…
}

export async function updateOrderStatusWorkflow(cmd: Command) {
const { orderId, status, scheduledFor, userId } = cmd.payload;
const tenantId = cmd.tenant_id;

switch (status) {
case 'confirmed': {
await notifyUser(userId, `Order ${orderId} confirmed.`);
const ms = new Date(scheduledFor).getTime() - now() - 30 * 60_000;
if (ms > 0) await sleep(ms);
await updateOrderStatus(orderId, tenantId, 'cooking');
break;
}
// …
}
await markCommandAsProcessed(cmd.id, tenantId);
}

// order.activities.ts   (activity context only)
// order.activities.ts  (runs in Node context)
import { createClient } from '@supabase/supabase-js';
import { OrderActivities } from './types';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const activities: OrderActivities = {
async notifyUser(userId, msg) { /* email/SMS/push */ },
async updateOrderStatus(orderId, tenantId, status) { /* emit domain cmd */ },
async scheduleReminder(orderId, tenantId, mins) { /* enqueue delayed cmd */ },
async recordCommand(cmd) { await sb.from('commands').insert(cmd); },
async markCommandAsProcessed(id) {
await sb.from('commands').update({ status:'processed' }).eq('id', id);
}
};

worker:
import { Worker } from '@temporalio/worker';
import * as orderWf from './order.workflows';
import { activities as orderAct } from './order.activities';

await Worker.create({
workflowsPath: require.resolve('./order.workflows'),
activities: orderAct,
taskQueue: 'orders',
}).then(w => w.run());

--

# Detailed implementation plan:

# Actionable Proposal: Hexagonal Architecture with Temporal Workflows

## Implementation Plan

### 1. Fix Non-Deterministic Code in Workflows
```typescript
// CHANGE IN: src/infra/temporal/workflows/order-workflows.ts (line 80)
// FROM:
await new Promise(resolve => setTimeout(resolve, timeUntilScheduled));
// TO:
import { sleep } from '@temporalio/workflow';
await sleep(timeUntilScheduled);
```

### 2. Properly Isolate Activities
```typescript
// RESTRUCTURE:
// 1. In order-workflows.ts:
import { proxyActivities } from '@temporalio/workflow';
import type { OrderActivities } from '../activities/order-activities';

const { notifyUser, updateOrderStatus, scheduleReminder, markCommandAsProcessed } = 
  proxyActivities<OrderActivities>({ startToCloseTimeout: '1 minute' });

// 2. In order-activities.ts:
export interface OrderActivities {
  notifyUser(userId: string, message: string): Promise<void>;
  updateOrderStatus(orderId: string, tenantId: string, status: string): Promise<void>;
  scheduleReminder(orderId: string, tenantId: string, delayInMinutes: number): Promise<void>;
  markCommandAsProcessed(commandId: string, tenantId: string): Promise<void>;
}

export const activities: OrderActivities = {
  async notifyUser(userId, message) { /* implementation */ },
  // other methods...
};
```

### 3. Use Workflow Time Functions
```typescript
// ADD TO: src/infra/temporal/workflows/order-workflows.ts
import { now } from '@temporalio/workflow';

// REPLACE time calculations with:
const scheduledTime = new Date(cmd.payload.scheduledFor).getTime();
const currentTime = now(); // Use Temporal's deterministic now()
const timeUntilScheduled = Math.max(0, scheduledTime - currentTime - 30 * 60 * 1000);
```

### 4. Minimize Workflow Return Values
```typescript
// CHANGE IN: src/infra/temporal/workflows/order-workflows.ts
// FROM:
return {
  status: "success",
  commandId: cmd.id,
  processedAt: new Date().toISOString()
};
// TO:
return { commandId: cmd.id }; // Minimal return value
```

### 5. Optimize Connection Management
```typescript
// CHANGE IN: src/infra/temporal/activities/order-activities.ts
// Create a singleton Supabase client:
let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { /* config */ }
    );
  }
  return supabaseClient;
}

// Use in activities:
export const activities = {
  async markCommandAsProcessed(commandId, tenantId) {
    const supabase = getSupabaseClient();
    // Use supabase client...
  }
};
```

### 6. Move Business Logic to Domain Layer
```typescript
// CHANGE IN: src/domain/aggregates/order.aggregate.ts
// Add methods for all status transitions:
public confirmOrder(): Event[] {
  if (this.status !== 'pending') {
    throw new Error('Order can only be confirmed when pending');
  }
  // Create and return event
}

public startCooking(): Event[] {
  if (this.status !== 'confirmed') {
    throw new Error('Order can only be cooked after confirmation');
  }
  // Create and return event
}

// CHANGE IN: workflows to call domain methods via activities
```

### 7. Implement Proper Multi-Tenancy
```typescript
// CHANGE IN: src/worker.ts
// Use Temporal namespaces for tenant isolation:
return Worker.create({
  workflowsPath: require.resolve('./infra/temporal/workflows/order-workflows'),
  activities,
  taskQueue,
  namespace: `tenant-${tenantId}`, // Use namespaces for isolation
});
```

### 8. Add Explicit Error Handling and Retries
```typescript
// ADD TO: src/infra/temporal/workflows/order-workflows.ts
const { notifyUser, updateOrderStatus } = proxyActivities<OrderActivities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    maximumInterval: '10s',
  }
});

// ADD try/catch blocks with compensation logic
try {
  await notifyUser(userId, message);
} catch (error) {
  // Log error and implement compensation logic
  console.error(`Failed to notify user: ${error}`);
  // Store failed notification for retry
}
```

### 9. Implement Event-Workflow Coordination
```typescript
// CHANGE IN: src/domain/services/order.service.ts
// Replace requiresJob flag with explicit mapping:
private workflowsForEventTypes = {
  [OrderEventType.ORDER_CREATED]: 'createOrder',
  [OrderEventType.ORDER_STATUS_UPDATED]: 'updateOrderStatus',
  // other mappings...
};

private async scheduleWorkflows(events: Event[], tenant_id: UUID): Promise<void> {
  for (const event of events) {
    const workflowType = this.workflowsForEventTypes[event.type];
    if (workflowType) {
      const command: Command = {
        id: crypto.randomUUID(),
        tenant_id,
        type: workflowType,
        payload: { ...event.payload, eventId: event.id }
      };
      await this.scheduler.schedule(command);
    }
  }
}
```

Build src/domain code to use with InMemory ports and adapters for testing. Scaffold a basic test with orders.

Test will 
-> dispatch a command
-> check that the events were published

