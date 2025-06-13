"use strict";
//core/event-bus.ts
/**
 * Event bus and event handler interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
/**
 * Event handler interface
 * Each process manager or projection implements this interface to handle specific event types
 */
/**
 * Event bus
 * Routes events to the appropriate handlers
 */
class EventBus {
    constructor() {
        this.handlers = [];
    }
    /**
     * Register an event handler
     * @param handler The event handler to register
     */
    register(handler) {
        this.handlers.push(handler);
    }
    /**
     * Publish an event to all interested handlers
     * @param event The event to publish
     */
    async publish(event) {
        await this.publishBatch([event]);
    }
    /**
     * Publish a batch of events to all interested handlers
     * @param events The events to publish
     */
    async publishBatch(events) {
        for (const event of events) {
            await Promise.all(this.handlers
                .filter(handler => handler.supportsEvent(event))
                .map(handler => handler.on(event)));
        }
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=event-bus.js.map