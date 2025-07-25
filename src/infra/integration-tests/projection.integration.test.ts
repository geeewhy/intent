import {v4 as uuidv4} from 'uuid';
import {Scheduler} from '../temporal/scheduler';
import {Command} from '../../core/contracts';
import {SystemCommandType} from '../../core/example-slices/system/contracts';
import {createPool} from '../projections/pg-pool';
import {sql} from 'slonik';
import {waitForNewEvents, wait} from './utils';
import {PgEventStore} from '../pg/pg-event-store';
import * as dotenv from 'dotenv';
import {log} from '../../core/logger';

dotenv.config();
const TEST_TIMEOUT = 30000;

describe('Projection Integration Tests', () => {
    let scheduler: Scheduler;
    let eventStore: PgEventStore;
    let tenantId: string;
    let pool: any;
    let schedules = [];

    beforeAll(async () => {
        tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
        log()?.info('Setting up Projection Integration Tests', { tenantId });
        scheduler = await Scheduler.create(tenantId);
        eventStore = new PgEventStore();
        pool = createPool();
        log()?.info('Projection Integration Tests setup complete');
    }, TEST_TIMEOUT);

    afterAll(async () => {
        log()?.info('Cleaning up Projection Integration Tests');
        await pool.end();
        await eventStore.close();
        await scheduler.close();
        log()?.info('Projection Integration Tests cleanup complete');
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

        log()?.debug('Waiting for system_status record', { 
            aggregateId, 
            timeoutMs, 
            intervalMs 
        });

        while (Date.now() - start < timeoutMs) {
            try {
                const result = await pool.query(sql`
                    SELECT *
                    FROM system_status
                    WHERE id = ${aggregateId}
                `);

                if (result.rows.length > 0) {
                    log()?.debug('Found system_status record', { 
                        aggregateId,
                        recordId: result.rows[0].id,
                        elapsedMs: Date.now() - start
                    });
                    return result.rows[0];
                }
            } catch (error) {
                log()?.error('Error querying system_status table', { 
                    aggregateId, 
                    error 
                });
            }

            await wait(intervalMs);
        }

        const err = new Error(`Timed out waiting for system_status record with id ${aggregateId}`);
        log()?.error('Timeout waiting for system_status record', { 
            aggregateId, 
            timeoutMs,
            error: err
        });
        throw err;
    };

    test('TEST_EXECUTED command creates a record in system_status table', async () => {
        // Setup
        const aggregateId = uuidv4();
        const aggregateType = 'system';
        const testId = uuidv4();
        const testName = 'integration-test';

        log()?.info('Starting test for TEST_EXECUTED command', { 
            aggregateId, 
            aggregateType, 
            testName 
        });

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

        log()?.info('TEST_EXECUTED command projection test passed', { 
            recordId: record.id,
            testName: record.testName,
            result: record.result,
            numberExecutedTests: record.numberExecutedTests
        });
    }, TEST_TIMEOUT);

    test('Multiple TEST_EXECUTED commands update the numberExecutedTests counter', async () => {
        // Setup
        const aggregateId = uuidv4();
        const aggregateType = 'system';

        log()?.info('Starting test for multiple TEST_EXECUTED commands', { 
            aggregateId, 
            aggregateType 
        });

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

        log()?.info('Multiple TEST_EXECUTED commands projection test passed', { 
            recordId: record.id,
            testName: record.testName,
            result: record.result,
            numberExecutedTests: record.numberExecutedTests,
            parameters: record.parameters
        });
    }, TEST_TIMEOUT);
});

/**
 * RLS (Row Level Security) Integration Tests
 * 
 * These tests verify that the RLS policies for the system_status table are working correctly.
 * We test three scenarios:
 * 1. A tester can only read their own records (where testerId matches their user_id)
 * 2. A developer can read all records regardless of testerId within their tenant
 * 3. A developer can only read records from their own tenant, not from other tenants
 * 
 * The tests use:
 * - LOCAL_DB_USER/LOCAL_DB_PASSWORD to set up test data (admin privileges)
 * - LOCAL_DB_TEST_USER/LOCAL_DB_TEST_PASSWORD to test RLS policies (restricted privileges)
 * 
 * RLS is configured using the set_config SQL function to set JWT claims for different roles.
 */
describe('RLS Integration Tests', () => {
    let adminPool: any; // Pool with admin privileges for setup
    let testPool: any; // Pool with test user privileges for RLS testing
    let tenantId: string;
    let tenantId2: string; // Second tenant ID for cross-tenant tests
    let testerId1: string;
    let testerId2: string;

    beforeAll(async () => {
        // Load environment variables
        tenantId = uuidv4();
        tenantId2 = uuidv4(); // Generate a different tenant ID for cross-tenant tests
        testerId1 = uuidv4();
        testerId2 = uuidv4();

        log()?.info('Setting up RLS Integration Tests', { 
            tenantId, 
            tenantId2, 
            testerId1, 
            testerId2 
        });

        // Create admin pool for setup
        adminPool = createPool();

        // Create test pool with test user credentials
        const testConnectionString = `postgres://${process.env.LOCAL_DB_TEST_USER}:${process.env.LOCAL_DB_TEST_PASSWORD}@${process.env.LOCAL_DB_HOST}:${process.env.LOCAL_DB_PORT || '5432'}/${process.env.LOCAL_DB_NAME}`;
        testPool = createPool({ connectionString: testConnectionString });

        let lastEventUuid = uuidv4();

        log()?.info('Inserting test data for RLS tests');

        // Insert test data with admin pool - records for both tenants
        await adminPool.query(sql`
            INSERT INTO system_status (id, tenant_id, "testerId", "testName", result, "executedAt", parameters, "numberExecutedTests", updated_at, "last_event_id", "last_event_version")
            VALUES 
                (${uuidv4()}, ${tenantId}, ${testerId1}, 'Test 1', 'success', NOW(), '{"test": 1}'::jsonb, 1, NOW(), ${lastEventUuid}, 0),
                (${uuidv4()}, ${tenantId}, ${testerId2}, 'Test 2', 'success', NOW(), '{"test": 2}'::jsonb, 1, NOW(), ${lastEventUuid}, 0),
                (${uuidv4()}, ${tenantId2}, ${testerId1}, 'Test 3', 'success', NOW(), '{"test": 3}'::jsonb, 1, NOW(),${lastEventUuid}, 0),
                (${uuidv4()}, ${tenantId2}, ${testerId2}, 'Test 4', 'success', NOW(), '{"test": 4}'::jsonb, 1, NOW(), ${lastEventUuid}, 0)
        `);

        log()?.info('RLS Integration Tests setup complete');
    }, TEST_TIMEOUT);

    afterAll(async () => {
        log()?.info('Cleaning up RLS Integration Tests');

        // Clean up test data for both tenants
        await adminPool.query(sql`DELETE FROM system_status WHERE "testerId" IN (${testerId1}, ${testerId2}) AND tenant_id IN (${tenantId}, ${tenantId2})`);

        // Close pools
        await adminPool.end();
        await testPool.end();

        log()?.info('RLS Integration Tests cleanup complete');
    });

    test('Tester can only read their own records', async () => {
        // Set JWT claims for tester role with testerId1
        const testerClaimsJson = JSON.stringify({
            user_id: testerId1,
            tenant_id: tenantId,
            role: 'tester'
        });

        log()?.info('Setting tester claims for RLS test', { 
            testerClaims: testerClaimsJson,
            testerId: testerId1,
            tenantId
        });

        await testPool.query(sql`
            SELECT set_config(
                'request.jwt.claims',
                ${testerClaimsJson},
                false
            )
        `);


        // Query system_status table
        const result = await testPool.query(sql`SELECT * FROM system_status WHERE "testerId" IN (${testerId1}, ${testerId2})`);

        // Tester should only see their own records
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].testerId).toBe(testerId1);

        log()?.info('Tester RLS test passed', { 
            rowCount: result.rows.length,
            testerId: result.rows[0].testerId
        });
    });

    test('Developer can read all records within their tenant', async () => {
        // Set JWT claims for developer role
        const developerClaimsJson = JSON.stringify({
            user_id: uuidv4(),
            tenant_id: tenantId,
            role: 'developer'
        });

        log()?.info('Setting developer claims for RLS test', { 
            developerClaims: developerClaimsJson,
            tenantId
        });

        await testPool.query(sql`
            SELECT set_config(
                'request.jwt.claims',
                ${developerClaimsJson},
                false
            )
        `);

        // Query system_status table
        const result = await testPool.query(sql`SELECT * FROM system_status WHERE "testerId" IN (${testerId1}, ${testerId2})`);

        // Developer should see all records within their tenant
        expect(result.rows.length).toBe(2);
        expect(result.rows.map((row: { testerId: any; }) => row.testerId).sort()).toEqual([testerId1, testerId2].sort());
        // All records should be from the developer's tenant
        expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);

        log()?.info('Developer tenant access RLS test passed', { 
            rowCount: result.rows.length,
            testerIds: result.rows.map((row: { testerId: any; }) => row.testerId),
            allFromSameTenant: result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)
        });
    });

    test('Developer can only read records from their own tenant', async () => {
        // Set JWT claims for developer role with tenantId
        const developerClaimsJson = JSON.stringify({
            user_id: uuidv4(),
            tenant_id: tenantId,
            role: 'developer'
        });

        log()?.info('Setting developer claims for cross-tenant RLS test', { 
            developerClaims: developerClaimsJson,
            tenantId,
            otherTenantId: tenantId2
        });

        await testPool.query(sql`
            SELECT set_config(
                'request.jwt.claims',
                ${developerClaimsJson},
                false
            )
        `);

        // Query all system_status records across both tenants
        const result = await testPool.query(sql`
            SELECT * FROM system_status 
            WHERE tenant_id IN (${tenantId}, ${tenantId2})
        `);

        // Developer should only see records from their own tenant
        expect(result.rows.length).toBe(2);
        expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);
        expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)).toBe(true);

        log()?.info('Developer cross-tenant RLS test passed', { 
            rowCount: result.rows.length,
            allFromCorrectTenant: result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId),
            noRecordsFromOtherTenant: result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)
        });
    });
});
