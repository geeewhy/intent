/**
 * Test authentication utilities
 *
 * Provides functions for creating fake JWTs for testing
 */
/**
 * Sign in as a tenant for testing
 *
 * Creates a fake JWT with a test_tenant_id claim
 *
 * @param fakeTenantId The tenant ID to use in the JWT
 * @returns An object with the session and tenant ID
 */
export declare function signInAsTenant(fakeTenantId: string): Promise<{
    session: import("@supabase/supabase-js").AuthSession;
    tenantId: string;
}>;
/**
 * Create a Supabase client with test authentication
 *
 * @param fakeTenantId The tenant ID to use in the JWT
 * @returns A Supabase client with the test JWT
 */
export declare function createTestClient(fakeTenantId: string): Promise<import("@supabase/supabase-js").SupabaseClient<any, "public", any>>;
