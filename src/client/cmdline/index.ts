// src/client/cmdline/index.ts
import {SupabaseClient} from '@supabase/supabase-js';
import {v4 as uuidv4} from 'uuid';
import * as dotenv from 'dotenv';
import {Event} from '../../core/contracts';
import {OrderCommandType} from '../../core/order';
import {createAuthenticatedClient} from './test-auth';

// Load environment variables
dotenv.config();

// Parse command-line arguments
function parseArgs(): { tenant: string; mode: 'test-user' | 'superuser' } {
    const tenantIndex = process.argv.indexOf('--tenant');
    const tenant = tenantIndex !== -1 && process.argv[tenantIndex + 1] || process.env.TEST_TENANT_ID;

    const modeIndex = process.argv.indexOf('--mode');
    const mode = (modeIndex !== -1 && process.argv[modeIndex + 1]) as 'test-user' | 'superuser' || 'test-user';

    if (!tenant) {
        console.error('Error: Tenant ID is required');
        console.error('Usage: ts-node src/client/cmdline/index.ts --tenant <tenant-id> [--mode <test-user|superuser>]');
        process.exit(1);
    }

    if (mode !== 'test-user' && mode !== 'superuser') {
        console.error('Error: Mode must be either "test-user" or "superuser"');
        console.error('Usage: ts-node src/client/cmdline/index.ts --tenant <tenant-id> [--mode <test-user|superuser>]');
        process.exit(1);
    }

    return {tenant, mode};
}

// Global variables to manage subscription
let currentChannel: any = null;
let supabaseClient: SupabaseClient | null = null;
let tenantIdGlobal: string = '';
let modeGlobal: 'test-user' | 'superuser' = 'test-user';
let tokenRefreshInterval: NodeJS.Timeout | null = null;

// Subscribe to events
async function subscribeToEvents(supabase: SupabaseClient, tenantId: string): Promise<void> {
    // Store references for potential reconnection
    supabaseClient = supabase;
    tenantIdGlobal = tenantId;

    console.log(`Subscribing to events for tenant: ${tenantId}`);

    // Generate a unique channel ID to avoid conflicts with previous channels
    const channelId = `events-${tenantId}-${Date.now()}`;
    const filter = `tenant_id=eq.${tenantId}`;

    // Remove any existing channel subscription
    if (currentChannel) {
        console.log('Removing existing channel subscription before creating a new one');
        await supabase.removeChannel(currentChannel);
    }

    // Create new channel subscription
    currentChannel = supabase
        .channel(channelId)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'events',
                filter,
            },
            (payload: { new: Event }) => {
                const event = payload.new;
                console.log('\n=== New Event Received ===');
                console.log(`ID: ${event.id}`);
                console.log(`Type: ${event.type}`);
                console.log(`Aggregate ID: ${event.aggregateId}`);
                console.log(`Version: ${event.version}`);
                console.log('Payload:', JSON.stringify(event.payload, null, 2));
                console.log('===========================\n');
            }
        )
        .subscribe((status, err) => {
            console.log(`Subscription status: ${status}${err ? `, Error: ${err.message}` : ''}`);

            // Handle token expiration and connection issues
            if (status === 'CHANNEL_ERROR' && err) {
                if (err.message && err.message.includes('Token has expired')) {
                    console.log('Token expired. Refreshing authentication...');
                    handleTokenExpiration();
                }
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
                console.log('Connection lost. Attempting to reconnect...');
                setTimeout(() => reconnect(), 2000);
            }
        });

    console.log('Event subscription active. Waiting for events...');
}

// Handle token expiration
async function handleTokenExpiration(): Promise<void> {
    try {
        console.log('Refreshing authentication token...');

        // Clear existing refresh interval if any
        if (tokenRefreshInterval) {
            clearInterval(tokenRefreshInterval);
            tokenRefreshInterval = null;
        }

        // Get a fresh client with a new token
        const newSupabase = await createAuthenticatedClient(tenantIdGlobal, modeGlobal);

        // Update the global reference
        supabaseClient = newSupabase;

        // Resubscribe with the new client
        await subscribeToEvents(newSupabase, tenantIdGlobal);

        console.log('Successfully refreshed authentication and resubscribed');

        // Set up token refresh interval (refresh token before it expires)
        // Assuming tokens typically last 60 minutes, refresh every 50 minutes
        setupTokenRefreshInterval();
    } catch (err) {
        console.error('Error refreshing authentication:', err);
        console.log('Will retry authentication in 5 seconds...');
        setTimeout(() => handleTokenExpiration(), 5000);
    }
}

// Setup token refresh interval
function setupTokenRefreshInterval(): void {
    // Clear any existing interval
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
    }

    // Set a new interval to refresh the token every 50 minutes
    // This is to prevent the token from expiring (tokens typically last 60 minutes)
    tokenRefreshInterval = setInterval(() => {
        console.log('Proactively refreshing authentication token to prevent expiration...');
        handleTokenExpiration();
    }, 50 * 60 * 1000); // 50 minutes in milliseconds
}

// Reconnect after connection loss
async function reconnect(): Promise<void> {
    try {
        if (!supabaseClient || !tenantIdGlobal) {
            console.error('Cannot reconnect: missing client or tenant ID');
            return;
        }

        console.log('Attempting to reconnect...');

        // For reconnection issues, just try to resubscribe first
        await subscribeToEvents(supabaseClient, tenantIdGlobal);

        console.log('Successfully reconnected');
    } catch (err) {
        console.error('Error reconnecting:', err);
        console.log('Will retry connection in 5 seconds...');
        setTimeout(() => reconnect(), 5000);
    }
}

// Send a createOrder command with random values
async function sendCreateOrderCommand(supabase: SupabaseClient, tenantId: string): Promise<void> {
    try {
        const orderId = uuidv4();
        const command = {
                id: uuidv4(),
                tenant_id: tenantId,
                type: `order.${OrderCommandType.CREATE_ORDER}`, // keep domain prefix properly
                payload: {
                    orderId,
                    userId: `user-${Math.floor(Math.random() * 1000)}`,
                    items: [
                        {
                            menuItemId: `menu-item-${Math.floor(Math.random() * 100)}`,
                            quantity: Math.floor(Math.random() * 5) + 1,
                        },
                    ],
                    scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };

        console.log('Sending createOrder command:', JSON.stringify(command, null, 2));

        const {error, data} = await supabase.from('commands').insert(command).select();

        if (error) {
            console.error('Error inserting command:', error);

            // Check if the error is related to authentication
            if (error.code === '401' || (error.message && error.message.includes('JWT'))) {
                console.log('Authentication error detected. Refreshing token...');
                await handleTokenExpiration();

                // Retry the command with the new client
                console.log('Retrying command with refreshed token...');
                if (supabaseClient) {
                    return sendCreateOrderCommand(supabaseClient, tenantId);
                }
            }
        } else {
            console.log('Command successfully sent!', data);
        }
    } catch (err) {
        console.error('Error sending createOrder command:', err);
    }
}

// Main function
async function main(): Promise<void> {
    try {
        const {tenant, mode} = parseArgs();

        // Store mode globally for reconnection purposes
        modeGlobal = mode;

        console.log(`Initializing Supabase client as ${mode} for tenant: ${tenant}`);
        const supabase = await createAuthenticatedClient(tenant, mode);

        // Setup token refresh interval
        setupTokenRefreshInterval();

        // Subscribe to events
        await subscribeToEvents(supabase, tenant);

        // Send a createOrder command immediately
        await sendCreateOrderCommand(supabase, tenant);

        // Setup heartbeat to verify connection
        const heartbeatInterval = setInterval(async () => {
            try {
                console.log('Performing connection heartbeat...');

                // Skip if we don't have a client
                if (!supabaseClient) return;

                // Simple query to test connection
                const {error} = await supabaseClient.from('events').select('id').limit(1);

                if (error) {
                    console.error('Heartbeat failed:', error.message);

                    // Check if authentication error
                    if (error.code === '401' || (error.message && error.message.includes('JWT'))) {
                        await handleTokenExpiration();
                    } else {
                        // Other connection issues
                        await reconnect();
                    }
                } else {
                    console.log('Heartbeat successful, connection is active');
                }
            } catch (err) {
                console.error('Error in heartbeat:', err);
                await reconnect();
            }
        }, 30000); // Check every 30 seconds

        console.log('Press Ctrl+C to exit');

        // Handle clean shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down...');

            // Clear intervals
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);

            // Remove channel subscription
            if (currentChannel && supabaseClient) {
                await supabaseClient.removeChannel(currentChannel);
            }

            console.log('Cleanup complete. Exiting.');
            process.exit(0);
        });

        // Keep the process running to wait for events
        process.stdin.resume();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);