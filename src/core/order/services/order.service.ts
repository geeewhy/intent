// core/order/services/order.service.ts
/**
 * Order service - application service for handling order commands and events
 */

import { Command, Event, UUID } from '../../contracts';
import { CommandPort, EventPort, EventStorePort, EventPublisherPort } from '../../ports';
import { OrderAggregate } from '../aggregates/order.aggregate';
import { CommandHandler } from '../../command-bus';
import { EventHandler } from '../../event-bus';
import { createAggregatePayload } from '../../aggregates';
import {BaseAggregate} from "../../base/aggregate";

/**
 * Order service - implements the inbound ports (CommandPort, EventPort)
 * and uses the outbound ports (EventStorePort, EventPublisherPort)
 */

// Aggregate type constant to avoid hardcoding
const AGGREGATE_TYPE = 'order';
export class OrderService implements CommandPort, EventPort, CommandHandler, EventHandler {
  constructor(
      private readonly store: EventStorePort,
      private readonly publisher: EventPublisherPort
  ) {}

  /* ---------- Port Implementations ---------- */
  async handleWithAggregate(cmd: Command, aggregate: BaseAggregate<any>): Promise<Event[]> {
    if (!(aggregate instanceof OrderAggregate)) {
      throw new Error('Expected OrderAggregate but got something else');
    }
    return aggregate.handle(cmd);
  }

  /** Check if this service supports a command */
  supportsCommand(cmd: Command): boolean {
    return cmd.type.startsWith(`${AGGREGATE_TYPE}.`);
  }

  /** Check if this service supports an event */
  supportsEvent(event: Event): event is Event {
    return event.type.startsWith(`${AGGREGATE_TYPE}.`);
  }

  /** Dispatch a command */
  async dispatch(cmd: Command): Promise<void> {
    return this.handle(cmd);
  }

  /** Handle a command (CommandHandler) */
  async handle(cmd: Command): Promise<void> {
    console.log(`[OrderService] Handling command: ${cmd.type} for tenant: ${cmd.tenant_id}`);

    const aggregateId = cmd.payload.orderId || cmd.payload.testId;
    const aggregate = await this.loadAggregate(cmd.tenant_id, aggregateId);

    const events = aggregate.handle(cmd);

    if (events.length === 0) return;

    await this.store.append(
        cmd.tenant_id,
        AGGREGATE_TYPE,
        aggregateId,
        events,
        aggregate.getVersion()
    );

    await this.publisher.publish(events);

    console.log(`[OrderService] Command handled: ${cmd.type}`);
  }

  /** Handle an event (EventHandler) */
  async on(event: Event): Promise<void> {
    console.log(`[OrderService] Handling event: ${event.type} for tenant: ${event.tenant_id}`);

    const aggregate = await this.loadAggregate(event.tenant_id, event.aggregateId);

    aggregate.apply(event);

    await this.publisher.publish([event]);

    console.log(`[OrderService] Event handled: ${event.type}`);
  }

  /* ---------- Helpers ---------- */

  private async loadAggregate(tenantId: UUID, aggregateId: UUID): Promise<OrderAggregate> {
    const result = await this.store.load(tenantId, AGGREGATE_TYPE, aggregateId);

    if (!result || result.events.length === 0) {
      return OrderAggregate.create(createAggregatePayload(AGGREGATE_TYPE, aggregateId));
    }

    return OrderAggregate.rehydrate(result.events);
  }
}
