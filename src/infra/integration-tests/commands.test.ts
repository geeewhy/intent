import { v4 as uuidv4 } from 'uuid';
import { TemporalScheduler } from '../temporal/temporal-scheduler';
import { Command, Event } from '../../core/contracts';
import { OrderCommandType, OrderEventType } from '../../core/order/contracts';
import { getAggregateWorkflowId, getSagaWorkflowId, getWorkflowsById, verifyWorkflowsById, getWorkflowDetails, wait, verifyNoLeakedWorkflows } from './utils';
import { PgEventStore } from '../pg/pg-event-store';
import { waitForNewEvents, waitForSnapshot } from './utils';

const TEST_TIMEOUT = 30000;

describe('Temporal Workflow Integration Tests', () => {
    let scheduler: TemporalScheduler;
    let eventStore: PgEventStore;
    let tenantId: string;

    beforeAll(async () => {
        tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
        scheduler = await TemporalScheduler.create(tenantId);
        eventStore = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await eventStore.close();
    });

    test('Command should create aggregate and apply event', async () => {
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        const command: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: OrderCommandType.CREATE_ORDER,
            payload: {
                orderId,
                userId,
                aggregateId: orderId,
                aggregateType: 'order',
                scheduledFor: new Date(),
                items: [{ menuItemId: 'menu-1', quantity: 1 }],
                status: 'pending',
            },
            metadata: { userId, timestamp: new Date() }
        };

        await scheduler.schedule(command);

        const events = await waitForNewEvents(eventStore, tenantId, 'order', orderId, 0, 1);
        expect(events[0].type).toBe(OrderEventType.ORDER_CREATED);

        const workflowId = getAggregateWorkflowId(tenantId, 'order', orderId);
        const workflows = await getWorkflowsById(scheduler, [workflowId]);
        verifyWorkflowsById(workflows, [workflowId], 1);
    }, TEST_TIMEOUT);

    test('Sequential commands should reuse same workflow and maintain version', async () => {
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;
        const workflowId = getAggregateWorkflowId(tenantId, 'order', orderId);

        for (let i = 0; i < 3; i++) {
            const command: Command = {
                id: uuidv4(),
                tenant_id: tenantId,
                type: OrderCommandType.EXECUTE_TEST,
                payload: {
                    orderId,
                    aggregateId: orderId,
                    aggregateType: 'order',
                },
                metadata: { userId, timestamp: new Date() }
            };

            void scheduler.schedule(command);
            await waitForNewEvents(eventStore, tenantId, 'order', orderId, i, 1);
        }

        const workflows = await getWorkflowsById(scheduler, [workflowId]);
        await wait(1000);
        verifyWorkflowsById(workflows, [workflowId], 1);
    }, TEST_TIMEOUT);

    test('Command should signal Saga after Aggregate is completed', async () => {
        const orderId = uuidv4();
        const userId = `user-${uuidv4()}`;

        const command: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: OrderCommandType.CREATE_ORDER,
            payload: {
                orderId,
                userId,
                aggregateId: orderId,
                aggregateType: 'order',
                scheduledFor: new Date(),
                items: [{ menuItemId: 'menu-1', quantity: 1 }],
                status: 'pending',
            },
            metadata: { userId, timestamp: new Date() }
        };

        await scheduler.schedule(command);

        const aggWfId = getAggregateWorkflowId(tenantId, 'order', orderId);
        const sagaWfId = getSagaWorkflowId(tenantId, orderId);

        const aggDetails = await getWorkflowDetails(scheduler, aggWfId);
        expect(aggDetails?.status?.name).toBe('COMPLETED');

        const sagaDetails = await getWorkflowDetails(scheduler, sagaWfId);
        expect(sagaDetails?.startTime?.getTime()).toBeGreaterThanOrEqual(
            aggDetails?.closeTime?.getTime() ?? 0
        );

        verifyWorkflowsById(await getWorkflowsById(scheduler, [sagaWfId, aggWfId]), [sagaWfId, aggWfId], 2);
    }, TEST_TIMEOUT);
});
