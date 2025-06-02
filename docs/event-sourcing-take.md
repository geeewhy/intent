# Event Sourcing - Intro and Outro

## Intent behind  
Event sourcing is a software design pattern where **every change to an application’s state is captured as an immutable event and stored in sequence**, rather than storing only the latest state. Each event represents a fact about something that happened (e.g., “Order Placed”, “Amount Deposited”), and the current state can be obtained by **replaying** all these events in order. This lets us query the current state *and* reconstruct past states or see how the state evolved over time.

## Analogy: Ledger vs. Snapshot  
- **Traditional (CRUD) approach:** Only the *current state* is stored -- like seeing just your latest bank statement (the current balance).  
- **Event sourcing approach:** *All changes* are stored as a sequence of events -- like having the full transaction ledger from day one (every deposit, withdrawal, etc.).  
With the ledger, you can explain *why* the balance is what it is by looking at the list of transactions, rather than a single number with no history.

## How It Works

*Example:* A warehouse product currently shows 59 units in stock.  
In a traditional system, the database might store a record that simply says `quantity = 59`.  
In an event-sourced system, the **sequence of events** that led to 59 would be stored instead:  

1. “Received 10 units”  
2. “Received 5 units”  
3. “Shipped 6 units”  
4. “Inventory adjusted +50 units”

To derive the current quantity, the application starts from zero and **applies each event in order** (10 + 5 − 6 + 50 = 59).

### Replaying Events  
1. **Start from an initial state.**  
2. **Apply events one by one.**  
3. **Arrive at the current state.**  

The ordered list of events for a single entity (e.g., an order or a product) is often called an **event stream**.

## Benefits of Event Sourcing
- **Complete history & audit trail:** Every change is recorded, making it easy to trace how and why something reached its current state.  
- **Rebuild past states (“time travel”):** You can recreate the system’s state at any moment by replaying events up to that point.  
- **Flexible projections (views):** Multiple read-models can be built from the same event log, each tailored to specific queries or dashboards.  
- **Scalability and decoupling:** Writes append to a log; reads come from separate, optimized projections. This fits well with **CQRS** (Command Query Responsibility Segregation) and can improve performance in high-scale systems.

## Final Thoughts & Trade-offs

### Event Sourcing as a Knowledge Model

Event Sourcing isn’t just about capturing **lossless data** -- it’s about building a system that **models, interprets, and understands business reality** in a structured, testable way.

---

### Events = Facts

Each event (e.g., `OrderPlaced`, `PaymentCaptured`) is an immutable record of **something that happened**. It encodes **a business truth**, not an opinion or prediction. Events are the factual bedrock of system knowledge.

---

### Context = Sequence of Events

The full **event stream** for an aggregate or system provides **context** -- the timeline of decisions and outcomes. This sequence preserves causality, intent, and evolution, enabling deep inspection or replay.

---

### Interpretation = Core Domain Code

Core domain logic (aggregates, policies, invariants) replays the event stream to:

- **Rehydrate state**
- **Evaluate business rules**
- **Decide which commands are valid**
- **Emit new events**

This layer gives **meaning** to facts -- turning raw data into domain-relevant behavior.

---

### Understanding = Projections

Projections (read models) interpret and **summarize event history into current state**. They reflect the system’s *understanding* of the world -- often optimized for queries, business decisions, or user interfaces.

---

### Summary Table

| Concept            | Role in Event Sourcing                                                    |
|--------------------|---------------------------------------------------------------------------|
| **Events**         | Immutable business facts -- atomic knowledge units                         |
| **Context**        | Ordered history of events -- preserves causality and evolution             |
| **Interpretation** | Core domain logic -- applies rules, derives meaning                        |
| **Projections**    | Business understanding -- distilled, queryable, actionable state           |

---

### Why This Matters

> **Traditional systems store state; event-sourced systems store knowledge.**

- CRUD systems overwrite data and lose reasoning over time.  
- Event Sourcing **captures what happened, in what order, and why** -- enabling retrospective analysis, auditability, and richer business insights.  
- The combination of **immutable facts + domain reasoning + understanding layers** makes Event Sourcing a true knowledge-centric architecture.

#### Closing notes: Addressing the Complexity in Systems

Event Sourcing requires deliberate structure but that doesn’t make CRUD simpler by default. CRUD systems often start lightweight but become convoluted as business logic grows. Implicit workflows, scattered conditionals, and cross-cutting concerns creep in, turning diagrams into dense webs of interactions. The simplicity is superficial: data is overwritten, intent is lost, and tracing why something happened becomes difficult. Event Sourcing embraces complexity upfront to make behavior explicit, reproducible, and evolvable.
