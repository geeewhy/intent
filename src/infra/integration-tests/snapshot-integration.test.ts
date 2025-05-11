//src/infra/integration-tests/snapshot-integration.test.ts
import {v4 as uuidv4} from 'uuid';
import {TemporalScheduler} from '../temporal/temporal-scheduler';
import {Command, Event} from '../../core/contracts';
import {OrderCommandType, OrderEventType} from '../../core/order';
import {waitForNewEvents, waitForSnapshot} from "./utils";

import {
    verifyNoLeakedWorkflows
} from './utils';
import { PgEventStore } from '../pg/pg-event-store';

// Test timeout - increase if needed for slower environments
const TEST_TIMEOUT = 30000; // 30 seconds

describe('Snapshot Integration Tests', () => {
    let scheduler: TemporalScheduler;
    let tenantId: string;
    let eventStore: PgEventStore;
    let allSchedules: Promise<any>[] = [];
    let aggregateType = 'order'; //todo change it to test, isolate test aggregate in core

    // Setup before all tests
    beforeAll(async () => {
        // Get tenant ID from environment or use a default for testing
        tenantId = process.env.TEST_TENANT_ID || 'test-tenant';

        // Create temporal scheduler
        scheduler = await TemporalScheduler.create(tenantId);

        // Create event store
        eventStore = new PgEventStore();

        console.log('Test setup complete with tenant ID:', tenantId);
    }, TEST_TIMEOUT);

    // Cleanup after all tests
    afterAll(async () => {
        // Any cleanup needed
        await eventStore.close();
        await Promise.all(allSchedules);
        console.log('Cleaning up test resources, waiting workflows to finish...');
        await verifyNoLeakedWorkflows(scheduler, tenantId);
        console.log('Test cleanup complete');
    });

    /**
     * Test that verifies snapshots are taken with configured frequency (every 2 events)
     */
    test('Snapshots taken every 2 aggregate loads, odd events be applied', async () => {
        // Create a unique order ID for this test
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        // Create first command
        const firstCommand: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: OrderCommandType.EXECUTE_TEST,
            payload: {
                orderId,
                userId,
                aggregateId: orderId,
                aggregateType: aggregateType,
            },
            metadata: {
                userId,
                timestamp: new Date(),
            },
        };

        console.log('Scheduling execute test command');
        let events = [];
        allSchedules.push(scheduler.schedule(firstCommand));

        // Wait for events to be created
        events = await waitForNewEvents(eventStore, tenantId, aggregateType, orderId, 0, 1);
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].type).toBe(OrderEventType.TEST_EXECUTED);

        // Check that no snapshot exists yet (only 1 event)
        let maybeSnapshot = await eventStore.loadSnapshot(tenantId, aggregateType, orderId);
        expect(maybeSnapshot).toBeNull();

        // Create a second command
        const secondCommand: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: OrderCommandType.EXECUTE_TEST,
            payload: {
                orderId,
                aggregateId: orderId,
                aggregateType: aggregateType,
            },
            metadata: {
                userId,
                timestamp: new Date(),
            },
        };

        console.log('Scheduling 2nd command');
        allSchedules.push(scheduler.schedule(secondCommand));

        // Wait for events to be created
        events = await waitForNewEvents(eventStore, tenantId, aggregateType, orderId, 1, 1);
        let snapshot = await waitForSnapshot(eventStore, tenantId, aggregateType, orderId, 1);
        expect(snapshot).not.toBeNull();
        expect(snapshot?.version).toBe(2);
        expect(events[0].version).toBe(2);

        // Verify the snapshot state
        expect(snapshot?.state).toBeDefined();
        expect(snapshot?.state.numberExecutedTests).toBe(2);

        const thirdCommand: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: OrderCommandType.EXECUTE_TEST,
            payload: {
                orderId,
                aggregateId: orderId,
                aggregateType: aggregateType,
            },
            metadata: {
                userId,
                timestamp: new Date(),
            },
        };
        allSchedules.push(scheduler.schedule(thirdCommand));

        //verify last event
        events = await waitForNewEvents(eventStore, tenantId, aggregateType, orderId, 2, 1);
        const lastEvent = events[0];
        expect(lastEvent.type).toBe(OrderEventType.TEST_EXECUTED);
        expect(lastEvent.payload.numberExecutedTests).toBe(3);
    }, TEST_TIMEOUT);
});
