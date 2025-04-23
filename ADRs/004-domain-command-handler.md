To keep the architecture grow-able beyond OrderService, we introduce a Command Bus that owns the routing logic. All edges—HTTP, WebSocket, Realtime listeners, Temporal—hand every command to this bus. Internally the bus locates the right domain service and hands the message off.

```
interface CommandHandler<C extends Command = Command> {
  supports(cmd: Command): cmd is C;   // Does this handler take the cmd?
  handle(cmd: C): Promise<void>;      // Execute business logic
}
```

Each domain service (OrderService, InventoryService, PaymentService …) implements that interface:

```
class OrderService implements CommandHandler {
  supports(cmd: Command) {
    return cmd.type.startsWith('order.');
  }
  async handle(cmd: Command) {
    /* existing dispatch logic */
  }
}

```

Building command bus
```
class CommandBus {
  private handlers: CommandHandler[] = [];

  register(h: CommandHandler) { this.handlers.push(h); }

  async dispatch(cmd: Command) {
    const h = this.handlers.find(h => h.supports(cmd));
    if (!h) throw new Error(`No handler for ${cmd.type}`);
    await h.handle(cmd);
  }
}
```

At boot we register every service once:

```
const bus = new CommandBus();
bus.register(new OrderService(store, publisher));
bus.register(new InventoryService(store, publisher));
bus.register(new PaymentService(store, publisher));
```

CommandPump:
we want every command to enter through a workflow:
```
class WorkflowRouter implements CommandHandler {
  supports() { return true; }                 // handles every cmd
  async handle(cmd: Command) {
    const id = `${cmd.tenant_id}-${cmd.payload.aggregateId}`;
    await temporal.signalWithStart(orderSaga,
      { workflowId: id, taskQueue:`tenant-${cmd.tenant_id}`, args:[cmd] },
      ['externalCommand', cmd]               // signal if already running
    );
  }
}

bus.register(new WorkflowRouter())
```

Inside orderSaga we add an activity dispatchCommand() that calls the same bus, so the workflow re-uses core rules:

```
const { dispatchCommand } = proxyActivities<{ dispatchCommand(cmd: Command): Promise<void> }>({ startToCloseTimeout:'1 minute' });

await dispatchCommand(cmd);   // events flow through aggregates as usual
```

Benefits from a systems perspective
Open-Closed – adding BillingService tomorrow is a single bus.register() call.
Unified observability – one bus means one spot for metrics, tracing, retries, auth.
Hexagonal purity – services remain pure; only adapters touch Postgres, Temporal, or WebSockets.
Idempotency – signalWithStart guarantees each command is processed once even across restarts.
Future flexibility – if a subset of commands should bypass Temporal later, we deregister WorkflowRouter and expose selected services directly—no change to aggregates.