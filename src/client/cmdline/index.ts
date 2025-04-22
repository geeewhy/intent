// src/client/cmdline/index.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { Event, OrderCommandType } from '../../domain/contracts';
import { createAuthenticatedClient } from './test-auth';

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

  return { tenant, mode };
}

// Subscribe to events
async function subscribeToEvents(supabase: SupabaseClient, tenantId: string): Promise<void> {
  console.log(`Subscribing to events for tenant: ${tenantId}`);

  const filter = `tenant_id=eq.${tenantId}`;
  supabase
      .channel(`events-${tenantId}`)
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
      });

  console.log('Event subscription active. Waiting for events...');
}

// Send a createOrder command with random values
async function sendCreateOrderCommand(supabase: SupabaseClient, tenantId: string): Promise<void> {
  try {
    const orderId = uuidv4();
    const command = {
      id: uuidv4(),
      tenant_id: tenantId,
      type: OrderCommandType.CREATE_ORDER,
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
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Sending createOrder command:', JSON.stringify(command, null, 2));

    const { error, data } = await supabase.from('commands').insert(command).select();

    if (error) {
      console.error('Error inserting command:', error);
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
    const { tenant, mode } = parseArgs();

    console.log(`Initializing Supabase client as ${mode} for tenant: ${tenant}`);
    const supabase = await createAuthenticatedClient(tenant, mode);

    // Subscribe to events
    await subscribeToEvents(supabase, tenant);

    // Send a createOrder command immediately
    await sendCreateOrderCommand(supabase, tenant);

    console.log('Press Ctrl+C to exit');

    // Keep the process running to wait for events
    process.stdin.resume();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);