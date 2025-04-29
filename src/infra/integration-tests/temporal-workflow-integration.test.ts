import { v4 as uuidv4 } from 'uuid';
import { TemporalScheduler } from '../temporal/temporal-scheduler';
import { Command, Event } from '../../core/contracts';
import { OrderCommandType, OrderEventType } from '../../core/order/contracts';
import { createAuthenticatedClient } from '../../client/cmdline/test-auth';
import { SupabaseClient } from '@supabase/supabase-js';

// Test timeout - increase if needed for slower environments
const TEST_TIMEOUT = 30000; // 30 seconds

describe('Temporal Workflow Integration Tests', () => {
  let scheduler: TemporalScheduler;
  let supabase: SupabaseClient;
  let tenantId: string;

  // Setup before all tests
  beforeAll(async () => {
    // Get tenant ID from environment or use a default for testing
    tenantId = process.env.TEST_TENANT_ID || 'test-tenant';

    // Create authenticated Supabase client
    supabase = await createAuthenticatedClient(tenantId, 'test-user');

    // Create temporal scheduler
    scheduler = await TemporalScheduler.create();

    console.log('Test setup complete with tenant ID:', tenantId);
  }, TEST_TIMEOUT);

  // Cleanup after all tests
  afterAll(async () => {
    // Any cleanup needed
    console.log('Test cleanup complete');
  });

  // Helper function to wait for a specific time
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to check if events were created
  const checkForEvents = async (aggregateId: string, expectedCount: number, maxAttempts = 5): Promise<Event[]> => {
    let attempts = 0;
    let events: Event[] = [];

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('created_at', { ascending: true });

      console.log('Got events:', data);

      if (error) {
        console.error('Error fetching events:', error);
      } else if (data && data.length >= expectedCount) {
        events = data;
        break;
      }

      await wait(100);
      attempts++;
    }

    return events;
  };

  test('Command should be routed to Aggregate processCommand workflow', async () => {
    // Create a unique order ID for this test
    const orderId = uuidv4();
    const userId = `user-${uuidv4()}`;

    // Create a command
    const command: Command = {
      id: uuidv4(),
      tenant_id: tenantId,
      type: `${OrderCommandType.CREATE_ORDER}`,
      payload: {
        orderId,
        userId,
        aggregateId: orderId,
        aggregateType: 'order',
        scheduledFor: new Date(),
        items: [
          {
            menuItemId: `menu-item-${Math.floor(Math.random() * 100)}`,
            quantity: Math.floor(Math.random() * 5) + 1,
          },
        ],
        status: 'pending',
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    };

    console.log('Scheduling command:', command.type);

    // Schedule the command
    await scheduler.schedule(command);

    // Wait for events to be created
    const events = await checkForEvents(orderId, 1);

    // Verify that at least one event was created
    expect(events.length).toBeGreaterThan(0);

    // Verify that the first event is an OrderCreated event
    expect(events[0].type).toContain(OrderEventType.ORDER_CREATED);

    console.log('Command test complete');
  }, TEST_TIMEOUT);

  xtest('Event should be routed to both processEvent and processSaga workflows', async () => {
    // Create a unique order ID for this test
    const orderId = uuidv4();
    const userId = `user-${uuidv4()}`;

    // Create an event
    const event: Event = {
      id: uuidv4(),
      tenant_id: tenantId,
      type: `order.${OrderEventType.ORDER_CREATED}`,
      aggregateId: orderId,
      version: 1,
      payload: {
        orderId,
        userId,
        aggregateType: 'order',
        items: [
          {
            menuItemId: `menu-item-${Math.floor(Math.random() * 100)}`,
            quantity: Math.floor(Math.random() * 5) + 1,
          },
        ],
        status: 'pending',
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    };

    console.log('Publishing event:', event.type);

    // Publish the event
    await scheduler.publish([event]);

    // Wait for a short time to allow the workflows to process
    await wait(5000);

    // Check for additional events that might have been created by the saga
    const events = await checkForEvents(orderId, 1);

    // Verify that the event was processed
    // Note: This is a basic check - in a real test, you might want to verify specific outcomes
    expect(events.length).toBeGreaterThan(0);

    console.log('Event test complete');
  }, TEST_TIMEOUT);

  xtest('Command should signal Saga after Aggregate workflow is complete', async () => {
    // Create a unique order ID for this test
    const orderId = uuidv4();
    const userId = `user-${uuidv4()}`;

    // Create a command that both Aggregate and Saga will handle
    const command: Command = {
      id: uuidv4(),
      tenant_id: tenantId,
      type: `order.${OrderCommandType.CREATE_ORDER}`,
      payload: {
        orderId,
        userId,
        aggregateId: orderId,
        aggregateType: 'order',
        items: [
          {
            menuItemId: `menu-item-${Math.floor(Math.random() * 100)}`,
            quantity: Math.floor(Math.random() * 5) + 1,
          },
        ],
        status: 'pending',
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    };

    console.log('Scheduling command that should trigger both Aggregate and Saga:', command.type);

    // Schedule the command
    await scheduler.schedule(command);

    // Wait for events to be created
    const events = await checkForEvents(orderId, 1);

    // Verify that at least one event was created by the Aggregate
    expect(events.length).toBeGreaterThan(0);

    // Wait a bit longer for the Saga to process
    await wait(5000);

    // Check for delayed commands in the commands table
    // Note: This is a basic check - in a real test, you might want to verify specific outcomes
    const { data: delayedCommands, error } = await supabase
      .from('commands')
      .select('*')
      .eq('payload->orderId', orderId)
      .neq('type', `order.${OrderCommandType.CREATE_ORDER}`);

    if (error) {
      console.error('Error fetching delayed commands:', error);
    }

    // The OrderSaga should schedule a delayed CANCEL_ORDER command
    if (delayedCommands && delayedCommands.length > 0) {
      console.log('Found delayed commands:', delayedCommands.length);
      // Optionally verify the command type
      expect(delayedCommands.some(cmd => cmd.type.includes(OrderCommandType.CANCEL_ORDER))).toBeTruthy();
    }

    console.log('Saga signal test complete');
  }, TEST_TIMEOUT);
});
