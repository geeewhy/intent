//core/event-bus.ts
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
export class EventBus {
  private handlers: EventHandler[] = [];

  /**
   * Register an event handler
   * @param handler The event handler to register
   */
  register(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Publish an event to all interested handlers
   * @param event The event to publish
   */
  async publish(event: Event): Promise<void> {
    await this.publishBatch([event]);
  }

  /**
   * Publish a batch of events to all interested handlers
   * @param events The events to publish
   */
  async publishBatch(events: Event[]): Promise<void> {
    for (const event of events) {
      await Promise.all(
        this.handlers
          .filter(handler => handler.supportsEvent(event))
          .map(handler => handler.on(event))
      );
    }
  }
}