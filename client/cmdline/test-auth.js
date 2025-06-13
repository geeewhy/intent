"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthenticatedClient = createAuthenticatedClient;
exports.createTestClient = createTestClient;
exports.createSuperuserClient = createSuperuserClient;
// src/client/auth/test-auth.ts
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Creates a Supabase client with proper authentication
 * @param tenantId The tenant ID to use
 * @param mode The authentication mode (test-user or superuser)
 */
async function createAuthenticatedClient(tenantId, mode = 'test-user') {
    try {
        // Get environment variables and check they exist
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in your .env file');
        }
        // Create initial client with anon key and custom headers for tenant ID
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
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
        let email;
        let password;
        if (mode === 'superuser') {
            const superuserEmail = process.env.SUPABASE_SUPERUSER_EMAIL;
            const superuserPassword = process.env.SUPABASE_SUPERUSER_PASSWORD;
            if (!superuserEmail || !superuserPassword) {
                throw new Error('SUPABASE_SUPERUSER_EMAIL and SUPABASE_SUPERUSER_PASSWORD must be defined in your .env file for superuser mode');
            }
            email = superuserEmail;
            password = superuserPassword;
        }
        else { // test-user mode
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
        }
        else {
            console.log('Database connection verified successfully');
        }
        return supabase;
    }
    catch (error) {
        console.error('Error creating authenticated client:', error);
        throw error;
    }
}
/**
 * @deprecated Use createAuthenticatedClient instead
 */
async function createTestClient(tenantId) {
    return createAuthenticatedClient(tenantId, 'test-user');
}
/**
 * Creates a Supabase client authenticated as a superuser
 */
async function createSuperuserClient(tenantId) {
    return createAuthenticatedClient(tenantId, 'superuser');
}
//# sourceMappingURL=test-auth.js.map