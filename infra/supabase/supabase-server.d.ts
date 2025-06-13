/**
 * Supabase server for handling client connections and commands
 */
/**
 * Supabase server for handling client connections and commands
 * Replaces the Colyseus room functionality
 */
export declare class SupabaseServer {
    private readonly supabaseUrl;
    private readonly supabaseKey;
    private client;
    private eventListeners;
    /**
     * Constructor
     * @param supabaseUrl The Supabase URL
     * @param supabaseKey The Supabase API key
     */
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Handle a command from a client
     */
    private handleCommand;
    /**
     * Get or create a service for a tenant
     */
    private getOrCreateService;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
}
