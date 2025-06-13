/**
 * Event pump implementation
 * Listens for new events and publishes them to the event bus
 */
import { EventBus } from '../../core/event-bus';
/**
 * Start the event pump
 * @param eventBus The event bus to publish events to
 */
export declare function startEventPump(eventBus: EventBus): void;
