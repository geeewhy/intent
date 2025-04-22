// src/client/auth/test-auth.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

type AuthMode = 'test-user' | 'superuser';

/**
 * Creates a Supabase client with proper authentication
 * @param tenantId The tenant ID to use
 * @param mode The authentication mode (test-user or superuser)
 */
export async function createAuthenticatedClient(
    tenantId: string,
    mode: AuthMode = 'test-user'
): Promise<SupabaseClient> {
    try {
        // Get environment variables and check they exist
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file');
        }

        // Create initial client with anon key and custom headers for tenant ID
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: true,
            },
            global: {
                headers: {
                    'x-tenant-id': tenantId,
                },
            },
        });

        console.log(`Authenticating as ${mode} for tenant: ${tenantId}`);

        // Get credentials from environment variables based on mode
        let email: string;
        let password: string;

        if (mode === 'superuser') {
            const superuserEmail = process.env.SUPABASE_SUPERUSER_EMAIL;
            const superuserPassword = process.env.SUPABASE_SUPERUSER_PASSWORD;

            if (!superuserEmail || !superuserPassword) {
                throw new Error('SUPABASE_SUPERUSER_EMAIL and SUPABASE_SUPERUSER_PASSWORD must be defined in your .env file for superuser mode');
            }

            email = superuserEmail;
            password = superuserPassword;
        } else { // test-user mode
            const testUserEmail = process.env.SUPABASE_TEST_USER_EMAIL;
            const testUserPassword = process.env.SUPABASE_TEST_USER_PASSWORD;

            if (!testUserEmail || !testUserPassword) {
                throw new Error('SUPABASE_TEST_USER_EMAIL and SUPABASE_TEST_USER_PASSWORD must be defined in your .env file for test-user mode');
            }

            email = testUserEmail;
            password = testUserPassword;
        }

        // Sign in with email and password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            throw new Error(`Authentication failed: ${authError.message}`);
        }

        if (!authData?.user) {
            throw new Error('Authentication succeeded but no user data returned');
        }

        console.log(`Successfully authenticated as ${email} (${mode})`);

        // Verify connection
        const { error } = await supabase.from('commands').select('id').limit(1);
        if (error) {
            console.warn(`Database connection check warning: ${error.message}`);
            console.log('Continuing anyway...');
        } else {
            console.log('Database connection verified successfully');
        }

        return supabase;
    } catch (error) {
        console.error('Error creating authenticated client:', error);
        throw error;
    }
}

/**
 * @deprecated Use createAuthenticatedClient instead
 */
export async function createTestClient(tenantId: string): Promise<SupabaseClient> {
    return createAuthenticatedClient(tenantId, 'test-user');
}

/**
 * Creates a Supabase client authenticated as a superuser
 */
export async function createSuperuserClient(tenantId: string): Promise<SupabaseClient> {
    return createAuthenticatedClient(tenantId, 'superuser');
}