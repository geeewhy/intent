import {v4 as uuidv4} from 'uuid';
import {TemporalScheduler} from '../temporal/temporal-scheduler';
import {Command, Event} from '../../core/contracts';
import {OrderCommandType, OrderEventType} from '../../core/order/contracts';
import {createAuthenticatedClient} from '../../client/cmdline/test-auth';
import {SupabaseClient} from '@supabase/supabase-js';
import {
    getSagaWorkflowId,
    getProcessEventWorkflowId,
    getWorkflowsById,
    verifyWorkflowsById,
    wait,
    checkForEvents, getWorkflowDetails
} from './utils';

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

        // For processEvent workflow, the ID is: ${tenantId}_${aggregateType}-${aggregateId}
        const aggregateWorkflowId = getProcessEventWorkflowId(tenantId, 'order', orderId);

        // Check for running workflows
        const workflows = await getWorkflowsById(scheduler, [aggregateWorkflowId]);

        // Verify that the workflow was executed
        verifyWorkflowsById(workflows, [aggregateWorkflowId], 1);

        console.log('Command test complete');
    }, TEST_TIMEOUT);

    test('Command should be applying events', async () => {
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
        const events = await checkForEvents(supabase, orderId, 1);

        // Verify that at least one event was created
        expect(events.length).toBeGreaterThan(0);

        // Verify that the first event is an OrderCreated event
        expect(events[0].type).toContain(OrderEventType.ORDER_CREATED);

        console.log('Command test complete');
    }, TEST_TIMEOUT);

    test('Event should be routed to both processEvent and processSaga workflows', async () => {
        // Create a unique order ID for this test
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        // Create an event
        const event: Event = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: `${OrderEventType.ORDER_CREATED}`,
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
                // Add a unique tracking ID that we can search for in logs or database
                causationId: uuidv4()
            },
        };
        let causationId = event.metadata?.causationId;
        console.log('Publishing event:', event.type, 'with tracking ID:', causationId);

        try {
            // Publish the event
            await scheduler.publish([event]);
            await wait(100); //tick

            // Generate workflow IDs
            const sagaWorkflowId = getSagaWorkflowId(tenantId, orderId);
            const aggregateWorkflowId = getProcessEventWorkflowId(tenantId, 'order', orderId);

            // Check for running workflows
            const workflows = await getWorkflowsById(
                scheduler,
                [sagaWorkflowId, aggregateWorkflowId]
            );

            // Verify that both workflows were executed
            verifyWorkflowsById(
                workflows,
                [sagaWorkflowId, aggregateWorkflowId],
                2
            );

            console.log('Event test complete - both workflows were executed');
        } finally {
        }
    }, TEST_TIMEOUT);

    test('Command should signal Saga after Aggregate workflow is complete', async () => {
        // Create a unique order ID for this test
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        // Create a command that both Aggregate and Saga will handle
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

        console.log('Scheduling command that should trigger both Aggregate and Saga:', command.type);

        // Schedule the command
        await scheduler.schedule(command);

        // Generate workflow IDs
        const sagaWorkflowId = getSagaWorkflowId(tenantId, orderId);
        const aggregateWorkflowId = getProcessEventWorkflowId(tenantId, 'order', orderId);

        const aggregateInfo = await getWorkflowDetails(scheduler, aggregateWorkflowId);
        expect(aggregateInfo?.status?.name).toBe('COMPLETED');

        // await wait(1000); //tick
        const sagaInfo = await getWorkflowDetails(scheduler, sagaWorkflowId);
        if (!sagaInfo || !sagaInfo?.startTime || !aggregateInfo?.closeTime) {
            throw new Error(`Aggregate Workflows not fully loaded.`);
        }
        expect(sagaInfo?.startTime.getTime()).toBeGreaterThanOrEqual(aggregateInfo?.closeTime.getTime());

        // Check for running workflows
        const workflows = await getWorkflowsById(
            scheduler,
            [sagaWorkflowId, aggregateWorkflowId]
        );

        // Verify that both workflows were executed
        console.log('Checking for workflows with IDs:', sagaWorkflowId, aggregateWorkflowId);
        verifyWorkflowsById(
            workflows,
            [sagaWorkflowId, aggregateWorkflowId],
            2
        );

        console.log('Saga signal test complete');
    }, TEST_TIMEOUT);

    test('Sequential commands should signal to the same aggregate instance', async () => {
        // Create a unique order ID for this test
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        // Create order command
        const createOrderCommand: Command = {
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

        console.log('Scheduling first command:', createOrderCommand.type);

        // Schedule the create order command
        let firstCommandHandler = scheduler.schedule(createOrderCommand);
        await wait(1); //tick

        // Create accept order command
        const acceptOrderCommand: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: `${OrderCommandType.ACCEPT_ORDER_MANUALLY}`,
            payload: {
                orderId,
                aggregateId: orderId,
                aggregateType: 'order',
            },
            metadata: {
                userId,
                timestamp: new Date(),
            },
        };

        console.log('Scheduling second command:', acceptOrderCommand.type);

        // Schedule the accept order command immediately after
        let secondCommandHandler = scheduler.schedule(acceptOrderCommand);

        // For processEvent workflow, the ID is: ${tenantId}_${aggregateType}-${aggregateId}
        const aggregateWorkflowId = getProcessEventWorkflowId(tenantId, 'order', orderId);

        // Wait a moment for workflows to stabilize
        await Promise.all([firstCommandHandler, secondCommandHandler]);

        // Check for running workflows - should be only one aggregate instance
        const workflows = await getWorkflowsById(scheduler, [aggregateWorkflowId]);

        // Verify that only one workflow is running for this aggregate
        verifyWorkflowsById(workflows, [aggregateWorkflowId], 1);

        // Wait for events to be created
        const events = await checkForEvents(supabase, orderId, 2, 5000);

        // Verify that exactly two events were created
        expect(events.length).toBe(2);

        // Verify that the first event is an OrderCreated event
        expect(events[0].type).toContain(OrderEventType.ORDER_CREATED);

        // Verify that the second event is an OrderManuallyAcceptedByCook event
        expect(events[1].type).toContain(OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK);

        console.log('Sequential commands test complete');
    }, TEST_TIMEOUT);

    test('Commands after aggregate lifetime should restart aggregate with hydration', async () => {
        // Create a unique order ID for this test
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        // Create order command
        const createOrderCommand: Command = {
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

        console.log('Scheduling create order command:', createOrderCommand.type);

        // Schedule the create order command
        await scheduler.schedule(createOrderCommand);

        // For processEvent workflow, the ID is: ${tenantId}_${aggregateType}-${aggregateId}
        const aggregateWorkflowId = getProcessEventWorkflowId(tenantId, 'order', orderId);

        // Verify the first workflow was created
        const workflowsAfterFirstCommand = await getWorkflowsById(scheduler, [aggregateWorkflowId]);
        expect(workflowsAfterFirstCommand.length).toBe(1);
        console.log('First aggregate workflow started as expected');

        // Wait for the first command to complete and the aggregate to die
        console.log('Waiting for aggregate to complete lifecycle...');
        await wait(1000);

        // Create cancel order command
        const cancelOrderCommand: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: `${OrderCommandType.CANCEL_ORDER}`,
            payload: {
                orderId,
                aggregateId: orderId,
                aggregateType: 'order',
                reason: 'Testing cancellation'
            },
            metadata: {
                userId,
                timestamp: new Date(),
            },
        };

        console.log('Scheduling cancel order command:', cancelOrderCommand.type);

        // Schedule the cancel order command after aggregate died
        await scheduler.schedule(cancelOrderCommand);

        // Check for workflows after second command
        // Should now show two workflows with the same ID pattern (one terminated, one active)
        const workflowsAfterSecondCommand = await getWorkflowsById(scheduler, [aggregateWorkflowId]);

        // Verify that there are now two workflows with this ID (one completed, one active)
        expect(workflowsAfterSecondCommand.length).toBe(2);
        console.log('Second aggregate workflow started as expected');

        // Wait for both events to be created
        const events = await checkForEvents(supabase, orderId, 2, 5000);

        // Verify that exactly two events were created
        expect(events.length).toBe(2);

        // Verify that the first event is an OrderCreated event
        expect(events[0].type).toContain(OrderEventType.ORDER_CREATED);

        // Verify that the second event is an OrderCancelled event
        expect(events[1].type).toContain(OrderEventType.ORDER_CANCELLED);

        console.log('Commands after aggregate lifetime test complete');
    }, TEST_TIMEOUT);
});
