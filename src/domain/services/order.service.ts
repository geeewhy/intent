/**
 * Order service - application service for handling order commands and events
 */

import { Command, Event, UUID } from '../contracts';
import { CommandPort, EventPort, EventStorePort, JobSchedulerPort, EventPublisherPort } from '../ports';
import { OrderAggregate } from '../aggregates/order.aggregate';

/**
 * Order service - implements the inbound ports (CommandPort, EventPort)
 * and uses the outbound ports (EventStorePort, JobSchedulerPort, EventPublisherPort)
 */
export class OrderService implements CommandPort, EventPort {
  /**
   * Constructor with all required ports
   */
  constructor(
    private readonly store: EventStorePort,
    private readonly scheduler: JobSchedulerPort,
    private readonly publisher: EventPublisherPort,
  ) {}

  /**
   * Handle an incoming command
   */
  async dispatch(cmd: Command): Promise<void> {
    console.log(`[OrderService] Handling command: ${cmd.type} for tenant: ${cmd.tenant}`);
    
    try {
      // Load the aggregate
      const aggregate = await this.loadAggregate(cmd.tenant, cmd.payload.orderId);
      
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
      
      // Schedule workflows for events that require them
      await this.scheduleWorkflows(events, cmd.tenant);
      
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
    console.log(`[OrderService] Handling event: ${event.type} for tenant: ${event.tenant}`);
    
    try {
      // Load the aggregate
      const aggregate = await this.loadAggregate(event.tenant, event.aggregateId);
      
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
  private async loadAggregate(tenant: UUID, aggregateId: UUID): Promise<OrderAggregate> {
    try {
      // Load events for this aggregate
      const events = await this.store.load(tenant, aggregateId);
      
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

  /**
   * Schedule workflows for events that require them
   */
  private async scheduleWorkflows(events: Event[], tenant: UUID): Promise<void> {
    // Filter events that require a workflow
    const jobEvents = events.filter(event => event.requiresJob);
    
    // Schedule a workflow for each event
    for (const event of jobEvents) {
      // Convert event to command for the workflow
      const command: Command = {
        id: crypto.randomUUID(),
        tenant: tenant,
        type: `process${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`, // e.g., processOrderCreated
        payload: {
          eventId: event.id,
          aggregateId: event.aggregateId,
          ...event.payload
        }
      };
      
      // Schedule the workflow
      await this.scheduler.schedule(command);
    }
  }
}