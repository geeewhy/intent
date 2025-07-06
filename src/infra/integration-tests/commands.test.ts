import { v4 as uuidv4 } from 'uuid';
import { Scheduler } from '../temporal/scheduler';
import { Command, Event } from '../../core/contracts';
import { SystemCommandType, SystemEventType } from '../../core/example-slices/system';
import { getAggregateWorkflowId, getSagaWorkflowId, getWorkflowsById, verifyWorkflowsById, getWorkflowDetails, wait, verifyNoLeakedWorkflows } from './utils';
import { PgEventStore } from '../pg/pg-event-store';
import { waitForNewEvents, waitForSnapshot } from './utils';
import { log } from '../../core/logger';

const TEST_TIMEOUT = 30000;

describe.only('Temporal Workflow Integration Tests', () => {
    let scheduler: Scheduler;
    let eventStore: PgEventStore;
    let tenantId: string;

    beforeAll(async () => {
        tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
        scheduler = await Scheduler.create(tenantId);
        eventStore = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await eventStore.close();
        await scheduler.close();
    });

    test('Command should create aggregate and apply event', async () => {
        log()?.info('Starting test for command creating aggregate and applying event');
        const aggregateId = uuidv4();
        const aggregateType = 'system';
        const userId = uuidv4();

        const command: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: SystemCommandType.LOG_MESSAGE,
            payload: {
                message: 'Test message',
                aggregateId,
                aggregateType,
            },
            metadata: { userId, timestamp: new Date() }
        };

        await scheduler.schedule(command);

        const events = await waitForNewEvents(eventStore, tenantId, 'system', aggregateId, 0, 1);
        expect(events[0].type).toBe(SystemEventType.MESSAGE_LOGGED);

        const workflowId = getAggregateWorkflowId(tenantId, 'system', aggregateId);
        const workflows = await getWorkflowsById(scheduler, [workflowId]);
        verifyWorkflowsById(workflows, [workflowId], 1);
    }, TEST_TIMEOUT);

    test('Sequential commands should reuse same workflow and maintain version', async () => {
        log()?.info('Starting test for sequential commands');
        const aggregateId = uuidv4();
        const aggregateType = 'system';
        const userId = uuidv4();
        const workflowId = getAggregateWorkflowId(tenantId, 'system', aggregateId);

        for (let i = 0; i < 3; i++) {
            const command: Command = {
                id: uuidv4(),
                tenant_id: tenantId,
                type: SystemCommandType.EXECUTE_TEST,
                payload: {
                    testId: uuidv4(),
                    testName: `Test ${i}`,
                    aggregateId,
                    aggregateType,
                    parameters: { param1: `value${i}` },
                },
                metadata: {
                    userId,
                    timestamp: new Date(),
                    role: 'tester',
                }
            };

            void scheduler.schedule(command);
            let events = await waitForNewEvents(eventStore, tenantId, 'system', aggregateId, i, 1);
            expect(events[0].type).toBe(SystemEventType.TEST_EXECUTED);
            expect(events[0].payload.testName).toBe(`Test ${i}`);
            expect(events[0].payload.numberExecutedTests).toBe(i + 1);
        }

        const workflows = await getWorkflowsById(scheduler, [workflowId]);
        await wait(1000);
        verifyWorkflowsById(workflows, [workflowId], 1);
    }, TEST_TIMEOUT);

    test('Command should signal Saga after Aggregate is completed', async () => {
        log()?.info('Starting test for command signaling saga');
        const aggregateId = uuidv4();
        const userId = uuidv4();
        const aggregateType = 'system';

        const command: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: SystemCommandType.EMIT_MULTIPLE_EVENTS,
            payload: {
                count: 3, // This will emit 3 events with indices 0, 1, 2
                aggregateId,
                aggregateType,
            },
            metadata: { userId, timestamp: new Date() }
        };

        await scheduler.schedule(command);

        const aggWfId = getAggregateWorkflowId(tenantId, 'system', aggregateId);
        const sagaWfId = getSagaWorkflowId(tenantId, aggregateId);

        const aggDetails = await getWorkflowDetails(scheduler, aggWfId);
        expect(aggDetails?.status?.name).toBe('COMPLETED');

        const sagaDetails = await getWorkflowDetails(scheduler, sagaWfId);
        expect(sagaDetails?.startTime?.getTime()).toBeGreaterThanOrEqual(
            aggDetails?.startTime?.getTime() ?? 0
        );

        //todo this changes time to time, mostly 3, sometimes 1 or 2... manual tests look okay.
        verifyWorkflowsById(await getWorkflowsById(scheduler, [sagaWfId, aggWfId]), [sagaWfId, aggWfId], 2);
    }, TEST_TIMEOUT);
});
