"use strict";
/**
 * Supabase server for handling client connections and commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseServer = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const pg_event_store_1 = require("../pg/pg-event-store");
const scheduler_1 = require("../temporal/scheduler");
/**
 * Supabase server for handling client connections and commands
 * Replaces the Colyseus room functionality
 */
class SupabaseServer {
    /**
     * Constructor
     * @param supabaseUrl The Supabase URL
     * @param supabaseKey The Supabase API key
     */
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.eventListeners = new Map();
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Start the server
     */
    async start() {
        console.log('[SupabaseServer] Starting server');
        // Set up the Supabase Realtime client to listen for commands
        this.client
            .channel('commands')
            .on('broadcast', { event: 'command' }, async (payload) => {
            await this.handleCommand(payload);
        })
            .subscribe();
        console.log('[SupabaseServer] Server started');
    }
    /**
     * Handle a command from a client
     */
    async handleCommand(payload) {
        try {
            // Extract the command data
            const { data, userId, tenantId } = payload;
            // Validate the command
            const commandSchema = zod_1.z.object({
                type: zod_1.z.string(),
                payload: zod_1.z.any(),
            });
            const validatedData = commandSchema.parse(data);
            // Create a command with tenant ID and client ID
            const command = {
                id: (0, uuid_1.v4)(),
                tenant_id: tenantId,
                type: validatedData.type,
                payload: validatedData.payload,
                metadata: {
                    userId: userId,
                    timestamp: new Date(),
                },
            };
            console.log(`[SupabaseServer] Handling command: ${command.type} from user: ${userId}`);
            // Get or create the service for this tenant
            const service = await this.getOrCreateService(tenantId);
            // Dispatch the command to the domain service
            await service.dispatch(command);
            // Send acknowledgement to the client
            await this.client
                .channel(`tenant-${tenantId}`)
                .send({
                type: 'broadcast',
                event: 'ack',
                payload: { commandId: command.id }
            });
        }
        catch (error) {
            console.error('[SupabaseServer] Error handling command:', error);
            // Send error to the client
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your command';
            const errorCode = error?.code || 'UNKNOWN_ERROR';
            await this.client
                .channel(`tenant-${payload.tenantId}`)
                .send({
                type: 'broadcast',
                event: 'error',
                payload: {
                    message: errorMessage,
                    code: errorCode,
                }
            });
        }
    }
    /**
     * Get or create a service for a tenant
     */
    async getOrCreateService(tenantId) {
        console.log(`[SupabaseServer] Creating service for tenant: ${tenantId}`);
        // Create adapters
        const eventStore = new pg_event_store_1.PgEventStore();
        const scheduler = await scheduler_1.Scheduler.create();
        //
        // // Use the TemporalScheduler as both JobSchedulerPort and EventPublisherPort
        // // This ensures events are published to the appropriate aggregate workflows
        // const publisher = scheduler;
        //
        // // Create event listener
        // //const eventListener = new PgNotifyListener(tenantId, service);
        //
        // // Start listening for events
        // //await eventListener.start();
        //
        // // Store the service and event listener
        // this.eventListeners.set(tenantId, eventListener);
        //
        // console.log(`[SupabaseServer] Service created for tenant: ${tenantId}`);
        //
        // return service;
    }
    /**
     * Stop the server
     */
    async stop() {
        console.log('[SupabaseServer] Stopping server');
        // Stop all event listeners
        for (const [tenantId, eventListener] of this.eventListeners.entries()) {
            console.log(`[SupabaseServer] Stopping event listener for tenant: ${tenantId}`);
            await eventListener.stop();
        }
        // Clear the maps
        this.eventListeners.clear();
        console.log('[SupabaseServer] Server stopped');
    }
}
exports.SupabaseServer = SupabaseServer;
//# sourceMappingURL=supabase-server.js.map