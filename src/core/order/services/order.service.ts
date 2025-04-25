/**
 * Order service - application service for handling order commands and events
 */

import { Command, Event, UUID } from '../../contracts';
import { CommandPort, EventPort, EventStorePort, EventPublisherPort } from '../../ports';
import { OrderAggregate } from '../aggregates/order.aggregate';
import { CommandHandler } from '../../command-bus';

/**
 * Order service - implements the inbound ports (CommandPort, EventPort)
 * and uses the outbound ports (EventStorePort, EventPublisherPort)
 */
export class OrderService implements CommandPort, EventPort, CommandHandler {
  /**
   * Constructor with all required ports
   */
  constructor(
    private readonly store: EventStorePort,
    private readonly publisher: EventPublisherPort,
  ) {}

  /**
   * Check if this handler supports the given command
   * @param cmd The command to check
   * @returns True if this handler supports the command, false otherwise
   */
  supports(cmd: Command): boolean {
    return cmd.type.startsWith('order.') || 
           cmd.type === 'createOrder' || 
           cmd.type === 'updateOrderStatus' || 
           cmd.type === 'cancelOrder' || 
           cmd.type === 'executeTest';
  }

  /**
   * Handle an incoming command (CommandPort implementation)
   */
  async dispatch(cmd: Command): Promise<void> {
    console.log(`[OrderService] Dispatching command: ${cmd.type} for tenant: ${cmd.tenant_id}`);
    return this.handle(cmd);
  }

  /**
   * Handle an incoming command (CommandHandler implementation)
   */
  async handle(cmd: Command): Promise<void> {
    console.log(`[OrderService] Handling command: ${cmd.type} for tenant: ${cmd.tenant_id}`);

    try {
      // Load the aggregate
      const aggregate = await this.loadAggregate(cmd.tenant_id, cmd.payload.orderId);

      // Handle the command and get resulting events
      const events = aggregate.handle(cmd);

      // If no events were produced, nothing to do
      if (events.length === 0) {
        return;
      }

      // Persist events to the event store
      await this.store.append(events);

      // Publish events to clients
      await this.publisher.publish(events);

      console.log(`[OrderService] Command handled successfully: ${cmd.type}`);
    } catch (error) {
      console.error(`[OrderService] Error handling command: ${cmd.type}`, error);
      throw error;
    }
  }

  /**
   * Handle an incoming event (e.g., from external systems)
   */
  async on(event: Event): Promise<void> {
    console.log(`[OrderService] Handling event: ${event.type} for tenant: ${event.tenant_id}`);

    try {
      // Load the aggregate
      const aggregate = await this.loadAggregate(event.tenant_id, event.aggregateId);

      // Apply the event to the aggregate
      aggregate.apply(event);

      // No need to persist the event as it's already in the store
      // But we might need to publish it to clients
      await this.publisher.publish([event]);

      console.log(`[OrderService] Event handled successfully: ${event.type}`);
    } catch (error) {
      console.error(`[OrderService] Error handling event: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Load an aggregate from the event store
   */
  private async loadAggregate(tenant_id: UUID, aggregateId: UUID): Promise<OrderAggregate> {
    try {
      // Load events for this aggregate
      const events = await this.store.load(tenant_id, aggregateId);

      // If no events, create a new aggregate
      if (events.length === 0) {
        return OrderAggregate.create({ 
          payload: { orderId: aggregateId } 
        } as any); // Type assertion for simplicity
      }

      // Rehydrate the aggregate from events
      return OrderAggregate.rehydrate(events);
    } catch (error) {
      console.error(`[OrderService] Error loading aggregate: ${aggregateId}`, error);
      throw error;
    }
  }

}
