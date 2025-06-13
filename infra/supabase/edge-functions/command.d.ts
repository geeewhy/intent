/**
 * Edge Function for handling commands
 *
 * Validates JWT, extracts tenant_id, and inserts commands into the database
 */
export declare const handler: (req: Request) => Promise<Response>;
