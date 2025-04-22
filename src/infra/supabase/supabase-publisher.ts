/**
 * Supabase adapter for the EventPublisherPort
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Event, UUID } from '../../domain/contracts';
import { EventPublisherPort } from '../../domain/ports';

/**
 * Supabase implementation of the EventPublisherPort
 * Uses Supabase Realtime to publish events to clients
 */
export class SupabasePublisher implements EventPublisherPort {
  private client: SupabaseClient;

  /**
   * Constructor
   * @param supabaseUrl The Supabase URL
   * @param supabaseKey The Supabase API key
   */
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseKey: string
  ) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Publish events to clients
   * @param events The events to publish
   */
  async publish(events: Event[]): Promise<void> {
    for (const event of events) {
      console.log(`[SupabasePublisher] Broadcasting event: ${event.type}`);

      try {
        // Broadcast the event to the tenant-specific channel
        await this.client
          .channel(`tenant-${event.tenant_id}`)
          .send({
            type: 'broadcast',
            event: 'event',
            payload: event
          });
      } catch (error) {
        console.error(`[SupabasePublisher] Error broadcasting event: ${event.type}`, error);
      }
    }
  }
}
