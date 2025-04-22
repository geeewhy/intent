/**
 * Integration test for the executeTest command
 * 
 * This script sends an executeTest command to the server and listens for the testExecuted event
 */

import { createTestClient } from '../../client/auth/test-auth';
import { v4 as uuidv4 } from 'uuid';
import { OrderCommandType } from '../../domain/contracts';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Generate a test tenant ID or use one from command line
    const tenantId = process.argv[2] || uuidv4();
    console.log(`Using tenant ID: ${tenantId}`);

    // Initialize Supabase client with test authentication
    console.log(`Initializing Supabase client with test authentication for tenant: ${tenantId}`);
    const supabase = await createTestClient(tenantId);

    // Subscribe to events
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
        (payload: any) => {
          const event = payload.new;
          console.log('\n=== New Event Received ===');
          console.log(`ID: ${event.id}`);
          console.log(`Type: ${event.type}`);
          console.log(`Aggregate ID: ${event.aggregate_id}`);
          console.log('Payload:', JSON.stringify(event.payload, null, 2));
          console.log('===========================\n');

          // Exit after receiving the testExecuted event
          if (event.type === 'testExecuted') {
            console.log('Test completed successfully!');
            process.exit(0);
          }
        }
      )
      .subscribe();

    console.log('Event subscription active. Waiting for events...');

    // Send executeTest command
    const testId = uuidv4();
    const command = {
      id: uuidv4(),
      tenant_id: tenantId,
      type: OrderCommandType.EXECUTE_TEST,
      payload: {
        testId,
        testName: 'Integration Test',
        parameters: {
          timestamp: new Date().toISOString(),
          description: 'Testing the executeTest command and testExecuted event'
        }
      },
      status: 'pending',
    };

    console.log('Sending executeTest command:', JSON.stringify(command, null, 2));

    const { error } = await supabase.from('commands').insert(command);
    if (error) {
      console.error('Error sending executeTest command:', error);
      process.exit(1);
    }

    console.log('Command sent successfully. Waiting for testExecuted event...');

    // Keep the process running to wait for events
    // The process will exit after receiving the testExecuted event
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);