// scripts/create-test-user.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Set up readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Prompts the user for input
 */
const prompt = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
};

/**
 * Creates a test user and tenant in Supabase
 */
async function createTestUserAndTenant() {
    try {
        console.log('⚙️ Creating test user and tenant...');

        // Get Supabase credentials from environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for admin operations

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file');
            console.log('📝 Add the service role key from your Supabase dashboard: Project Settings > API > service_role key');
            return;
        }

        // Initialize Supabase client with admin privileges
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if keys match expected format
        if (!supabaseServiceKey.startsWith('eyJ') || supabaseServiceKey.length < 100) {
            console.warn('⚠️ Warning: Your SUPABASE_SERVICE_ROLE_KEY doesn\'t match the expected format. Make sure you\'re using the correct key.');
        }

        console.log('');
        console.log('🔑 Setting up test user and tenant');
        console.log('');

        // --- TEST USER SETUP ---
        console.log('📝 TEST USER SETUP');

        // Get test user email from .env or prompt
        let testUserEmail = process.env.SUPABASE_TEST_USER_EMAIL;
        if (!testUserEmail) {
            testUserEmail = await prompt('Enter email for test user [test-user@example.com]: ');
            if (!testUserEmail) testUserEmail = 'test-user@example.com';
        }

        // Get test user password from .env or prompt
        let testUserPassword = process.env.SUPABASE_TEST_USER_PASSWORD;
        if (!testUserPassword) {
            testUserPassword = await prompt('Enter password for test user [testuser123]: ');
            if (!testUserPassword) testUserPassword = 'testuser123';
        }

        // Get tenant ID from environment variable or generate a new one
        const tenantId = process.env.TEST_TENANT_ID || uuidv4();
        console.log(`🏢 Using tenant ID: ${tenantId}`);

        console.log('');
        console.log('🔄 Creating user in Supabase...');

        // Create test user
        const { data: testUser, error: testUserError } = await supabase.auth.admin.createUser({
            email: testUserEmail,
            password: testUserPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                role: 'test_user',
                tenant_id: tenantId
            }
        });

        let userId;

        if (testUserError) {
            console.error(`❌ Error creating test user: ${testUserError.message}`);

            // Check if user might already exist
            if (testUserError.message.includes('already exists')) {
                console.log('🔄 Attempting to update existing test user...');

                // Get user by email
                const { data: { users } } = await supabase.auth.admin.listUsers();
                const existingUser = users.find(u => u.email === testUserEmail);

                if (existingUser) {
                    userId = existingUser.id;

                    // Update user metadata
                    const { data, error } = await supabase.auth.admin.updateUserById(
                        existingUser.id,
                        {
                            email: testUserEmail,
                            password: testUserPassword,
                            user_metadata: {
                                role: 'test_user',
                                tenant_id: tenantId
                            }
                        }
                    );

                    if (error) {
                        console.error(`❌ Error updating test user: ${error.message}`);
                        rl.close();
                        return;
                    } else {
                        console.log('✅ Updated existing test user successfully!');
                        console.log(`📧 Email: ${testUserEmail}`);
                        console.log(`🔑 Password: ${testUserPassword}`);
                        console.log(`🏢 Tenant ID: ${tenantId}`);
                    }
                }
            } else {
                rl.close();
                return;
            }
        } else {
            userId = testUser.user.id;
            console.log('✅ Created test user successfully!');
            console.log(`📧 Email: ${testUserEmail}`);
            console.log(`🔑 Password: ${testUserPassword}`);
            console.log(`🏢 Tenant ID: ${tenantId}`);
        }

        console.log('');
        console.log('🔄 Creating tenant and associating user...');

        // Create a tenant and associate the user with it
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .upsert({ id: tenantId, name: 'Test Tenant' })
            .select()
            .single();

        if (tenantError) {
            console.error(`❌ Error creating tenant: ${tenantError.message}`);
            rl.close();
            return;
        }

        console.log('✅ Created tenant successfully!');

        // Create profile entry linking user to tenant
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
                user_id: userId,
                tenant_id: tenantId,
                role: 'owner'
            })
            .select()
            .single();

        if (profileError) {
            console.error(`❌ Error creating profile: ${profileError.message}`);
            rl.close();
            return;
        }

        console.log('✅ Created profile linking user to tenant!');

        console.log('');
        console.log('🔐 Test user and tenant setup complete!');
        console.log('');
        console.log('⚠️ IMPORTANT: Update your .env file with these credentials:');
        console.log('');
        console.log(`SUPABASE_TEST_USER_EMAIL=${testUserEmail}`);
        console.log(`SUPABASE_TEST_USER_PASSWORD=${testUserPassword}`);
        console.log(`TEST_TENANT_ID=${tenantId}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error in setup:', error);
    } finally {
        rl.close();
    }
}

// Run the script
createTestUserAndTenant().catch(console.error);