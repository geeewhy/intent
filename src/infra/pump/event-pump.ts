/**
 * Event pump implementation
 * Listens for new events and publishes them to the event bus
 */

import { RealtimePumpBase } from './realtime-pump-base';
import { Event } from '../../core/contracts';
import { EventBus } from '../../core/event-bus';

/**
 * Start the event pump
 * @param eventBus The event bus to publish events to
 */
export function startEventPump(eventBus: EventBus) {
  console.log('[EventPump] Starting event pump');
  
  new RealtimePumpBase<Event>({
    channel: 'events-pump',
    eventSpec: {
      event: 'INSERT',
      schema: 'public',
      table: 'events'
    },
    batchSize: 200,
    validate: () => true, // Process all events
    processBatch: async events => {
      console.log(`[EventPump] Processing batch of ${events.length} events`);
      await eventBus.publishBatch(events);
    }
  }).start().catch(error => {
    console.error('[EventPump] Fatal error starting event pump:', error);
    process.exit(1);
  });
}

// Start the event pump if this file is run directly
if (require.main === module) {
  // Create a new event bus
  const eventBus = new EventBus();
  
  // Register event handlers here
  // eventBus.register(new OrderProcessManager(commandBus));
  // eventBus.register(new BillingProcessManager(commandBus));
  
  // Start the event pump
  startEventPump(eventBus);
}