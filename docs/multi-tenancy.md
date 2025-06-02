# Multi-Tenancy in SaaS: What, Why and How

n a nutshell, multi-tenancy is a software design where a single application instance (and its underlying infrastructure) serves **multiple customers** -- called *tenants* -- while **keeping each tenant’s data and configurations isolated** from others. This approach allows many users or organizations to share the same application and resources **without ever seeing each other’s data**, by design.

### Example Analogy

Multi-tenancy can be understood by analogy to an apartment building. All residents live under one roof and **share common infrastructure** like the building structure and utilities, but **each tenant has a private apartment with their own key and personal space**. Similarly, in a multi-tenant software system, **tenants share the application environment (servers, network, database)** yet each tenant’s data and workspace remain **logically isolated and secure** from all others. In typical SaaS application we run a single application that **serves many organizations**; each organization’s workspace is a *tenant* with its own isolated data, even though all workspaces run on the same application platform. Multi-tenancy is widely used in SaaS because it efficiently delivers one application to many clients while maintaining separation as if each had their own system.

## Why Multi-Tenancy Matters

Multi-tenant architecture is popular because it **delivers significant benefits** for both service providers and users:

* **Cost Efficiency:** By sharing the same infrastructure and application among multiple customers, providers can **spread out the costs** of hardware, maintenance, and operation. This makes the service more affordable for each tenant, as they essentially **pay only for a slice of a larger system** instead of bearing the full cost of a dedicated setup. Resource pooling means higher utilization and **lower per-customer expenses**.

* **Scalability:** Multi-tenant systems are **built to scale out easily**. Onboarding a new customer (tenant) usually doesn’t require deploying a new instance of the software; instead, the existing application can accommodate new tenants by creating a new account or configuration within the shared system. This makes it **quick to add new tenants** and handle growth, as the provider can manage **many tenants on one codebase** and infrastructure, scaling hardware/resources behind the scenes as needed.

* **Simplified Maintenance and Updates:** With a single shared application, **updates, bug fixes, and new features can be rolled out to all tenants at once**. The provider only needs to maintain **one application instance**, so tasks like patches, backups, and performance tuning apply to the platform as a whole. Tenants benefit by always running the **latest version** without needing to manage upgrades themselves.

* **Customization & Configuration:** Even though tenants share the core application, good multi-tenant design allows **per-tenant customization** at the configuration level (without altering the code for each customer). Each tenant can have its own settings, user roles, or even UI branding, giving the feel of a tailored solution while the provider still maintains one software base. This **“configurable single codebase”** approach lets customers meet their needs without costly one-off developments.

In short, multi-tenancy is important because it enables **scalable, efficient, and cost-effective software delivery**. Providers can serve many clients with one platform (economies of scale), and clients get a cloud service that is **affordable, always up-to-date, and can grow with them**.

## How Multi-Tenancy Works

&#x20;*Illustration of a multi-tenant architecture:* Multiple tenants (e.g. separate user organizations) **share one application and database** environment, but each tenant’s data is tagged or partitioned so that it’s **only accessible to that tenant**. In contrast, a single-tenant architecture would give each customer their own separate application instance and database (like each having their own house rather than an apartment in a shared building).

Under the hood, a multi-tenant system ensures isolation through its data design and access controls. Often, **all tenants share a single database and application instance, with tenant-specific identifiers (or schemas) distinguishing each tenant’s records**. The application logic is designed to always enforce these boundaries -- every query or operation is scoped to the requesting tenant’s ID, so tenants retrieve and modify only *their* data. This logical isolation is why users in one company can’t see data belonging to another, even though they use the **same application** and URL.

There are different architectural patterns to implement multi-tenancy. In one common approach, **tenants share the same database** (and tables), and each record is labeled with a tenant ID to segregate data. Another approach uses **separate databases (or schemas) for each tenant**, while still running a single application -- this provides stronger data isolation (each tenant’s data lives in its own silo) at the cost of more complexity in managing many databases. In all cases, the tenants share the application codebase and server resources. The choice of pattern depends on trade-offs: a single shared database is simpler and more cost-efficient, whereas per-tenant databases can improve security and avoid certain performance issues (at the expense of higher maintenance overhead). In practice, many SaaS providers start with a shared database model and may segment out heavy-usage tenants to their own databases as they grow (a hybrid approach).

## Architectural Considerations

Designing a robust multi-tenant system requires careful consideration of isolation, security, and performance:

* **Data Isolation & Security:** Ensuring that one tenant **cannot access another tenant’s data** is paramount. This is enforced at every layer -- from the database (using tenant IDs or separate schemas/DBs) to the application logic and authentication layer. Strong access control checks must be in place on every query and API call. A downside of multi-tenancy is that a flaw in isolation or a security breach could potentially expose data from multiple tenants, so the stakes are higher if something goes wrong. Providers often invest heavily in security measures (encryption, rigorous testing, tenant-specific encryption keys, etc.) to uphold isolation guarantees.

* **Performance Isolation (Noisy Neighbors):** In a shared environment, tenants also share finite resources (CPU, memory, bandwidth). A poorly-behaved or very busy tenant could consume disproportionate resources and **impact the performance for others** -- a phenomenon known as the *“noisy neighbor”* issue. Intent mitigates this by using resource quotas, scaling out infrastructure, and workload isolation strategies. For instance, the system might automatically allocate more resources or spin up new instances when a tenant’s usage spikes, or in some cases, high-traffic tenants can be moved to separate infrastructure. The goal is to ensure that the usage of one tenant **does not degrade service quality** for the rest.

* **Customization vs. Complexity:** A key promise of multi-tenancy is serving many customers on one platform, but different tenants might have varying needs. The architecture should allow a degree of configurability per tenant (e.g. feature toggles, custom fields, branding) **without branching the code** for each client. This often means building a flexible metadata-driven design (as seen in platforms like Salesforce’s multi-tenant architecture) to support per-tenant customizations. However, supporting heavy customization can add complexity -- so architects must balance offering flexibility with maintaining a common core that’s easy to maintain and scale.

* **Compliance and Tenant Isolation Requirements:** In some industries (finance, healthcare, government), regulations demand strict isolation of data. While multi-tenancy itself can be secure, companies with very sensitive data or strict compliance rules might opt for single-tenant deployments or a **hybrid approach** (dedicated instances for certain clients) to satisfy those needs. Architecture plans should consider if certain tenants require isolation at a level that multi-tenant sharing can’t easily provide. It's possible to design a platform that is “multi-tenant” for most customers, but allows a few tenants to have isolated components if needed (for example, a dedicated database or even a dedicated app server for that tenant).

## How Intent achieves Multi-Tenancy

We achieve **multi-tenancy** through a layered, tightly controlled architecture that enforces tenant isolation at every level of the stack. Here's how it's designed and enforced in `Intent`:

---

### **1. Infra-Level Isolation: Tenant ID as a First-Class Concept**

* Every command and event carries a `tenant_id`, enforced from edge to database.
* Postgres event store and command tables use composite keys with `tenant_id`:

  ```sql
  UNIQUE (tenant_id, aggregate_type, aggregate_id, version)
  ```
* Workflow IDs are tenant-scoped:

  ```
  {tenantId}_{aggregateType}-{aggregateId}
  ```

  This guarantees single-live-workflow per aggregate per tenant.

---

### **2. Row-Level Security (RLS) Enforcement in Projections**

* Projection definitions declare access policies in metadata.
* These are compiled into **PostgreSQL RLS policies**.
* All read access is mediated through least-privilege RLS, so even if projections share the same table, tenants only see their own rows.
* RLS rules are validated via a **CI linter**, ensuring no insecure reads reach production.

---

### **3. Workflow Sharding by Tenant**

* Each tenant's workflows run on their own **Temporal task queues**:

  ```ts
  taskQueue: `tenant-${cmd.tenant_id}`
  ```

  This supports operational isolation, back-pressure per tenant, and prevents cross-tenant signal confusion.

---

### **4. Multi-Tenant Safe Event Fan-Out**

* Workers (e.g. `event-pump.ts`) listen to shared event streams but filter and dispatch by `tenant_id`.
* Process managers (PMs) and sagas act within the tenant context they are registered for.

---

### **5. Core Logic Agnostic to Tenancy**

* `core/` domain modules (aggregates, sagas, events) are written as **shared-core logic**.
* They rely solely on the `tenantId` passed into ports (`EventStorePort`, etc.) but are otherwise tenant-agnostic.
* This makes tenant-specific divergence (e.g. custom rules) possible by replacing ports, not modifying core.

---

### *6. Tooling + Safety Nets**

* Validate `tenant_id` presence before processing Events and Commands.
* Snapshots and projections replay with tenant scoping.
* CI drift scanners, RLS linters, and test harnesses cover tenant isolation in projection correctness, snapshotting, and event-replay paths.

---

* Isolation enforced in Postgres via schema + RLS
* Isolation enforced in Temporal via task queue and workflow ID naming
* Command/event lifecycle respects tenant boundaries
* Core code is shared across tenants, ports allow override if divergence occurs


## Conclusion

Multi-tenant systems are fundamental to delivering **scalable and efficient software services** in the cloud era. By **serving many tenants from one platform**, companies achieve economies of scale: lower costs per customer, easier mass updates, and the ability to rapidly expand their user base. At the same time, careful architecture is required to ensure each tenant’s data is safe and performance remains reliable as the system grows. When designed well, multi-tenancy empowers software providers to innovate faster (since they maintain one codebase) and offer a consistent, high-quality experience to all customers, big or small. This concept underpins most SaaS offerings today, from CRMs to productivity suites, illustrating its value in modern software architecture **for building platforms that are both scalable and cost-effective**. With multi-tenancy, users get the benefits of a shared platform **without sacrificing the privacy and autonomy** they would have in a standalone system -- truly a win-win in software design.
