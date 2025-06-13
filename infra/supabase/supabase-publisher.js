"use strict";
/**
 * Supabase adapter for the EventPublisherPort
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabasePublisher = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Supabase implementation of the EventPublisherPort
 * Uses Supabase Realtime to publish events to clients
 */
class SupabasePublisher {
    /**
     * Constructor
     * @param supabaseUrl The Supabase URL
     * @param supabaseKey The Supabase API key
     */
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Publish events to clients
     * @param events The events to publish
     */
    async publish(events) {
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
            }
            catch (error) {
                console.error(`[SupabasePublisher] Error broadcasting event: ${event.type}`, error);
            }
        }
    }
}
exports.SupabasePublisher = SupabasePublisher;
//# sourceMappingURL=supabase-publisher.js.map