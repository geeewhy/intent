"use strict";
/**
 * Event pump implementation
 * Listens for new events and publishes them to the event bus
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEventPump = startEventPump;
const realtime_pump_base_1 = require("./realtime-pump-base");
const event_bus_1 = require("../../core/event-bus");
/**
 * Start the event pump
 * @param eventBus The event bus to publish events to
 */
function startEventPump(eventBus) {
    console.log('[EventPump] Starting event pump');
    new realtime_pump_base_1.RealtimePumpBase({
        channel: 'events-pump',
        eventSpec: {
            event: 'INSERT',
            schema: 'public',
            table: 'events'
        },
        batchSize: 200,
        validate: () => true, // Process all events
        processBatch: async (events) => {
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
    const eventBus = new event_bus_1.EventBus();
    // Register event handlers here
    // eventBus.register(new OrderProcessManager(commandBus));
    // eventBus.register(new BillingProcessManager(commandBus));
    // Start the event pump
    startEventPump(eventBus);
}
//# sourceMappingURL=event-pump.js.map