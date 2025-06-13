/**
 * Supabase adapter for the EventPublisherPort
 */
import { Event } from '../../core/contracts';
import { EventPublisherPort } from '../../core/ports';
/**
 * Supabase implementation of the EventPublisherPort
 * Uses Supabase Realtime to publish events to clients
 */
export declare class SupabasePublisher implements EventPublisherPort {
    private readonly supabaseUrl;
    private readonly supabaseKey;
    private client;
    /**
     * Constructor
     * @param supabaseUrl The Supabase URL
     * @param supabaseKey The Supabase API key
     */
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Publish events to clients
     * @param events The events to publish
     */
    publish(events: Event[]): Promise<void>;
}
