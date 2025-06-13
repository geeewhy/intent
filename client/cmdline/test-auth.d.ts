import { SupabaseClient } from '@supabase/supabase-js';
type AuthMode = 'test-user' | 'superuser';
/**
 * Creates a Supabase client with proper authentication
 * @param tenantId The tenant ID to use
 * @param mode The authentication mode (test-user or superuser)
 */
export declare function createAuthenticatedClient(tenantId: string, mode?: AuthMode): Promise<SupabaseClient>;
/**
 * @deprecated Use createAuthenticatedClient instead
 */
export declare function createTestClient(tenantId: string): Promise<SupabaseClient>;
/**
 * Creates a Supabase client authenticated as a superuser
 */
export declare function createSuperuserClient(tenantId: string): Promise<SupabaseClient>;
export {};
