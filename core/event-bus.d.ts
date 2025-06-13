/**
 * Event bus and event handler interfaces
 */
import { Event, EventHandler } from './contracts';
/**
 * Event handler interface
 * Each process manager or projection implements this interface to handle specific event types
 */
/**
 * Event bus
 * Routes events to the appropriate handlers
 */
export declare class EventBus {
    private handlers;
    /**
     * Register an event handler
     * @param handler The event handler to register
     */
    register(handler: EventHandler): void;
    /**
     * Publish an event to all interested handlers
     * @param event The event to publish
     */
    publish(event: Event): Promise<void>;
    /**
     * Publish a batch of events to all interested handlers
     * @param events The events to publish
     */
    publishBatch(events: Event[]): Promise<void>;
}
