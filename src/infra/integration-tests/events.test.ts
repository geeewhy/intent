import {v4 as uuid} from 'uuid';
import {PgEventStore} from '../pg/pg-event-store';
import {Event} from '../../core/contracts';
import {registerEventUpcaster, eventUpcasters} from '../../core/shared/event-upcaster';

describe('Event Store Integration Tests', () => {
    let eventStore: PgEventStore;
    const tenantId = uuid();
    const aggregateId = uuid();
    const aggregateType = 'TestAggregate';

    beforeAll(async () => {
        eventStore = new PgEventStore();
    });

    afterAll(async () => {
        await eventStore.close();
    });

    describe('Event Upcasting', () => {
        // Define event types for testing
        const EVENT_TYPE = 'TestEventUpcasted';
        const SCHEMA_VERSION_1 = 1;
        const SCHEMA_VERSION_2 = 2;

        beforeEach(() => {
            Object.keys(eventUpcasters).forEach(key => {
                delete eventUpcasters[key];
            });
        });

        it('should upcast events when loading from the event store', async () => {
            registerEventUpcaster(EVENT_TYPE, SCHEMA_VERSION_1, (payload) => {
                return {
                    ...payload,
                    upcasted: true,
                    newField: 'added by upcaster'
                };
            });

            // schema v1
            const originalEvent: Event = {
                id: uuid(),
                tenant_id: tenantId,
                type: EVENT_TYPE,
                aggregateId,
                aggregateType,
                version: 1,
                payload: {originalField: 'original value'},
                metadata: {
                    timestamp: new Date(),
                    schemaVersion: SCHEMA_VERSION_1
                }
            };

            // Store the event
            await eventStore.append(
                tenantId,
                aggregateType,
                aggregateId,
                [originalEvent],
                0
            );

            // load the event
            const result = await eventStore.load(tenantId, aggregateType, aggregateId);

            expect(result).not.toBeNull();
            expect(result!.events).toHaveLength(1);

            const loadedEvent = result!.events[0];
            expect(loadedEvent.type).toEqual(EVENT_TYPE);

            expect(loadedEvent.payload).toHaveProperty('originalField', 'original value');
            expect(loadedEvent.payload).toHaveProperty('upcasted', true);
            expect(loadedEvent.payload).toHaveProperty('newField', 'added by upcaster');
        });

        it('should handle multiple schema versions with different upcasters', async () => {
            registerEventUpcaster(EVENT_TYPE, SCHEMA_VERSION_1, (payload) => {
                return {
                    ...payload,
                    upcasted: 'from version 1'
                };
            });

            registerEventUpcaster(EVENT_TYPE, SCHEMA_VERSION_2, (payload) => {
                return {
                    ...payload,
                    upcasted: 'from version 2'
                };
            });

            const eventV1: Event = {
                id: uuid(),
                tenant_id: tenantId,
                type: EVENT_TYPE,
                aggregateId: uuid(),
                aggregateType,
                version: 1,
                payload: {data: 'v1 data'},
                metadata: {
                    timestamp: new Date(),
                    schemaVersion: SCHEMA_VERSION_1
                }
            };

            const eventV2: Event = {
                id: uuid(),
                tenant_id: tenantId,
                type: EVENT_TYPE,
                aggregateId: uuid(), // Different aggregate
                aggregateType,
                version: 1,
                payload: {data: 'v2 data'},
                metadata: {
                    timestamp: new Date(),
                    schemaVersion: SCHEMA_VERSION_2
                }
            };

            await eventStore.append(tenantId, aggregateType, eventV1.aggregateId, [eventV1], 0);
            await eventStore.append(tenantId, aggregateType, eventV2.aggregateId, [eventV2], 0);

            const resultV1 = await eventStore.load(tenantId, aggregateType, eventV1.aggregateId);
            expect(resultV1).not.toBeNull();
            expect(resultV1!.events[0].payload).toHaveProperty('upcasted', 'from version 1');

            const resultV2 = await eventStore.load(tenantId, aggregateType, eventV2.aggregateId);
            expect(resultV2).not.toBeNull();
            expect(resultV2!.events[0].payload).toHaveProperty('upcasted', 'from version 2');
        });

        it('should not modify events that have no registered upcaster', async () => {
            const EVENT_TYPE_NO_UPCASTER = 'EventWithNoUpcaster';

            const originalEvent: Event = {
                id: uuid(),
                tenant_id: tenantId,
                type: EVENT_TYPE_NO_UPCASTER,
                aggregateId: uuid(),
                aggregateType,
                version: 1,
                payload: {originalData: 'should remain unchanged'},
                metadata: {
                    timestamp: new Date(),
                    schemaVersion: SCHEMA_VERSION_1
                }
            };

            // Store the event
            await eventStore.append(
                tenantId,
                aggregateType,
                originalEvent.aggregateId,
                [originalEvent],
                0
            );

            // Load the event back
            const result = await eventStore.load(tenantId, aggregateType, originalEvent.aggregateId);

            // Verify the event was loaded without modification
            expect(result).not.toBeNull();
            expect(result!.events).toHaveLength(1);

            const loadedEvent = result!.events[0];
            expect(loadedEvent.payload).toEqual({originalData: 'should remain unchanged'});
        });
    });
});
