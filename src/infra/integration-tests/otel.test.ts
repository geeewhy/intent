// src/infra/integration-tests/projection-otel.test.ts
import {randomUUID} from 'node:crypto';
import {createPool} from '../projections/pg-pool';
import {projectEvents} from '../projections/projectEvents';
import {memoryExporter} from '../observability/otel-test-tracer';
import {Event} from '../../core/contracts';

const TEST_TIMEOUT = 30_000;

describe('projection → OTEL span', () => {
    let pool = createPool();

    afterAll(async () => {
        await pool.end();
    });

    it(
        'emits a projection.handle span',
        async () => {
            memoryExporter.reset();

            const evt: Event = {
                id: randomUUID(),
                type: 'testExecuted',
                tenant_id: randomUUID(),
                aggregateId: randomUUID(),
                aggregateType: 'system',
                version: 1,
                payload: {
                    testerId: randomUUID(),
                    testName: 'otel-projection-span',
                }
            };

            await projectEvents([evt], pool);                  // ← pass pool explicitly

            const spans = memoryExporter.getFinishedSpans();
            expect(spans.length).toBeGreaterThan(0);
            expect(spans[0].name).toBe('projection.handle.testExecuted');
        },
        TEST_TIMEOUT,
    );
});
