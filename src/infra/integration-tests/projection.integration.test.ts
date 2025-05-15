import {v4 as uuidv4} from 'uuid';
import {TemporalScheduler} from '../temporal/temporal-scheduler';
import {Command} from '../../core/contracts';
import {SystemCommandType} from '../../core/system/contracts';
import {createPool} from '../projections/pg-pool';
import {sql} from 'slonik';
import {waitForNewEvents, wait} from './utils';
import {PgEventStore} from '../pg/pg-event-store';

const TEST_TIMEOUT = 30000;

describe('Projection Integration Tests', () => {
    let scheduler: TemporalScheduler;
    let eventStore: PgEventStore;
    let tenantId: string;
    let pool: any;
    let schedules = [];

    beforeAll(async () => {
        tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
        scheduler = await TemporalScheduler.create(tenantId);
        eventStore = new PgEventStore();
        pool = createPool();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await pool.end();
        await eventStore.close();
    });

    /**
     * Helper function to wait for a record to appear in the system_status table
     */
    const waitForSystemStatusRecord = async (
        aggregateId: string,
        timeoutMs = 10000,
        intervalMs = 100
    ): Promise<any> => {
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            try {
                const result = await pool.query(sql`
                    SELECT *
                    FROM system_status
                    WHERE id = ${aggregateId}
                `);

                if (result.rows.length > 0) {
                    return result.rows[0];
                }
            } catch (error) {
                console.error('Error querying system_status table:', error);
            }

            await wait(intervalMs);
        }

        throw new Error(`Timed out waiting for system_status record with id ${aggregateId}`);
    };

    test('TEST_EXECUTED command creates a record in system_status table', async () => {
        // Setup
        const aggregateId = uuidv4();
        const aggregateType = 'system';
        const testId = uuidv4();
        const testName = 'integration-test';

        const command: Command = {
            id: uuidv4(),
            tenant_id: tenantId,
            type: SystemCommandType.EXECUTE_TEST,
            payload: {
                testId,
                testName,
                aggregateId,
                aggregateType,
                parameters: {integration: true}
            },
            metadata: {
                timestamp: new Date(),
                userId: uuidv4(),
                role: 'tester',
            }
        };

        // Act: Send the command
        await scheduler.schedule(command);

        // Wait for the event to be processed
        await waitForNewEvents(eventStore, tenantId, 'system', aggregateId, 0, 1);

        // Wait for the projection to create a record in the system_status table
        const record = await waitForSystemStatusRecord(aggregateId);

        // Assert: Verify the record was created with the correct data
        expect(record).toBeTruthy();
        expect(record.id).toBe(aggregateId);
        expect(record.tenant_id).toBe(tenantId);
        expect(record.testName).toBe(testName);
        expect(record.result).toBe('success');
        expect(record.parameters).toEqual({integration: true});
        expect(record.numberExecutedTests).toBe(1);
    }, TEST_TIMEOUT);

    test('Multiple TEST_EXECUTED commands update the numberExecutedTests counter', async () => {
        // Setup
        const aggregateId = uuidv4();
        const aggregateType = 'system';

        // Send three commands in sequence
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
                    parameters: {sequence: i}
                },
                metadata: {
                    timestamp: new Date(),
                    userId: uuidv4(),
                    role: 'tester',
                }
            };

            await scheduler.schedule(command);

            // Wait for the event to be processed
            await waitForNewEvents(eventStore, tenantId, 'system', aggregateId, i, 1);
        }

        // Wait for the projection to update the record in the system_status table
        const record = await waitForSystemStatusRecord(aggregateId);

        // Assert: Verify the record was updated with the correct data
        expect(record).toBeTruthy();
        expect(record.id).toBe(aggregateId);
        expect(record.tenant_id).toBe(tenantId);
        expect(record.testName).toBe('Test 2'); // Last test name
        expect(record.result).toBe('success');
        expect(record.parameters).toEqual({sequence: 2}); // Last parameters
        expect(record.numberExecutedTests).toBe(3); // Should be incremented to 3
    }, TEST_TIMEOUT);
});
