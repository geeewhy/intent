//src/infra/integration-tests/snapshot-integration.test.ts
import {v4 as uuidv4} from 'uuid';
import {Scheduler} from '../temporal/scheduler';
import {Command} from '../../core/contracts';
import {SystemCommandType, SystemEventType} from '../../core/example-slices/system';
import {waitForNewEvents, waitForSnapshot} from './utils';
import {PgEventStore} from '../pg/pg-event-store';

const TEST_TIMEOUT = 30_000;
const AGGREGATE_TYPE = 'system';

const makeCmd = (tenant: string, aggId: string, userId: string, payload = {
    testName: 'Snapshot Test',
}): Command => ({
    id: uuidv4(),
    tenant_id: tenant,
    type: SystemCommandType.EXECUTE_TEST,
    payload: {
        aggregateId: aggId,
        aggregateType: AGGREGATE_TYPE,
        testerId: userId,
        testId: aggId,
        ...payload
    },
    metadata: {userId, timestamp: new Date(), role: 'tester'},
});

describe('snapshot-frequency', () => {
    const tenant = uuidv4();
    const user = uuidv4();
    const schedules: Promise<any>[] = [];
    let scheduler: Scheduler;
    let store: PgEventStore;

    beforeAll(async () => {
        scheduler = await Scheduler.create(tenant);
        store = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await store.close();
        await Promise.all(schedules);
        await scheduler.close();
    });

    test(
        'writes snapshot at version 2',
        async () => {
            const id = uuidv4();

            schedules.push(scheduler.schedule(makeCmd(tenant, id, user)));
            await waitForNewEvents(store, tenant, AGGREGATE_TYPE, id, 0, 1);
            expect(await store.loadSnapshot(tenant, AGGREGATE_TYPE, id)).toBeNull();

            schedules.push(scheduler.schedule(makeCmd(tenant, id, user)));
            await waitForNewEvents(store, tenant, AGGREGATE_TYPE, id, 1, 1);

            const snap = await waitForSnapshot(store, tenant, AGGREGATE_TYPE, id, 1);
            expect(snap?.version).toBe(2);
            expect(snap?.state.numberExecutedTests).toBe(2);
        },
        TEST_TIMEOUT,
    );
});

describe('no-snapshot-before-threshold', () => {
    const tenant = uuidv4();
    const user = uuidv4();
    let scheduler: Scheduler;
    let store: PgEventStore;

    beforeAll(async () => {
        scheduler = await Scheduler.create(tenant);
        store = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await store.close();
        await scheduler.close();
    });

    test(
        'single event does not trigger snapshot',
        async () => {
            const id = uuidv4();
            await scheduler.schedule(makeCmd(tenant, id, user));
            await waitForNewEvents(store, tenant, AGGREGATE_TYPE, id, 0, 1);
            expect(await store.loadSnapshot(tenant, AGGREGATE_TYPE, id)).toBeNull();
        },
        TEST_TIMEOUT,
    );
});

describe('snapshot-concurrency', () => {
    const tenant = uuidv4();
    const user = uuidv4();
    let scheduler: Scheduler;
    let store: PgEventStore;

    beforeAll(async () => {
        scheduler = await Scheduler.create(tenant);
        store = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await store.close();
        await scheduler.close();
    });

    test(
        'parallel commands yield single snapshot',
        async () => {
            const id = uuidv4();

            await Promise.all([
                scheduler.schedule(makeCmd(tenant, id, user)),
                scheduler.schedule(makeCmd(tenant, id, user)),
            ]);

            await waitForNewEvents(store, tenant, AGGREGATE_TYPE, id, 0, 2);
            const snap = await waitForSnapshot(store, tenant, AGGREGATE_TYPE, id, 1);

            expect(snap?.version).toBe(2);
            const dup = await store.loadSnapshot(tenant, AGGREGATE_TYPE, id);
            expect(dup?.version).toBe(2);
        },
        TEST_TIMEOUT,
    );
});

describe('snapshot-cross-tenant', () => {
    const tenantA = uuidv4();
    const tenantB = uuidv4();
    const user = uuidv4();
    let schedA: Scheduler;
    let schedB: Scheduler;
    let store: PgEventStore;

    beforeAll(async () => {
        schedA = await Scheduler.create(tenantA);
        schedB = await Scheduler.create(tenantB);
        store = new PgEventStore();
    }, TEST_TIMEOUT);

    afterAll(async () => {
        await store.close();
        await Promise.all([schedA.close(), schedB.close()]);
    });

    test(
        'identical aggregateIds stay isolated per tenant',
        async () => {
            const id = uuidv4();

            let cmd = makeCmd(tenantA, id, user, {testName: 'Tenant TestA'});
            await Promise.all([
                schedA.schedule(makeCmd(tenantA, id, user, {testName: 'Tenant TestA'})),
                schedA.schedule(makeCmd(tenantA, id, user, {testName: 'Tenant TestA'})),
                schedB.schedule(makeCmd(tenantB, id, user, {testName: 'Tenant TestB'})),
                schedB.schedule(makeCmd(tenantB, id, user, {testName: 'Tenant TestB'})),
            ]);

            await waitForNewEvents(store, tenantA, AGGREGATE_TYPE, id, 0, 2);
            await waitForNewEvents(store, tenantB, AGGREGATE_TYPE, id, 0, 2);

            const snapA = await waitForSnapshot(store, tenantA, AGGREGATE_TYPE, id, 1);
            const snapB = await waitForSnapshot(store, tenantB, AGGREGATE_TYPE, id, 1);

            expect(snapA?.version).toBe(2);
            expect(snapB?.version).toBe(2);
            expect(snapA?.state).not.toEqual(snapB?.state);
        },
        TEST_TIMEOUT,
    );
});
