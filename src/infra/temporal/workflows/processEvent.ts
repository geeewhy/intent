// processEvent.ts
import {
    defineSignal,
    proxyActivities,
    setHandler,
    workflowInfo as wfInfo,
    condition,
    sleep
} from '@temporalio/workflow';
import type { Event, UUID } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';

// Signal for receiving new events for the aggregate
const eventSignal = defineSignal<[Event]>('event');

// Activities for interacting with the core domain
const { applyEvent, loadAggregate } = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

// TTL in milliseconds for the workflow to stay alive after last activity
const WORKFLOW_TTL_IN_MS = 1000;
const WORKFLOW_TTL_INTERVAL_IN_MS = 100;

/**
 * Process events for a specific aggregate
 * The workflowId should be in the format: {tenantId}_{aggregateType}-{aggregateId}
 * This ensures only one workflow is active for a given aggregate at a time
 */
export async function processEvent(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    initialEvent: Event
): Promise<void> {
    console.log(`[processEvent] Starting workflow for ${aggregateType}:${aggregateId}`);

    // Track the last activity time for TTL
    let lastActivityTime = Date.now();

    // Load the aggregate state
    const aggregateState = await loadAggregate(tenantId, aggregateType, aggregateId);
    console.log(`[processEvent] Loaded aggregate state: ${aggregateState ? 'exists' : 'new'}`);
    let eventExecuted  = false;
    // Set up signal handler for new events
    setHandler(eventSignal, async (event) => {
        console.log(`[processEvent] Received event signal: ${event.type}`);
        lastActivityTime = Date.now();

        // Apply the event to the aggregate
        const resultEvents = await applyEvent(tenantId, aggregateType, aggregateId, event);
        console.log(`[processEvent] Event applied, produced ${resultEvents.length} additional events`);

        // Update last activity time after event application
        lastActivityTime = Date.now();
        eventExecuted = true;
    });

    // Keep workflow alive until TTL expires
    await condition(() => eventExecuted);

    //keep it alive for TTL
    while (true) {
        await sleep(WORKFLOW_TTL_INTERVAL_IN_MS);
        if (Date.now() - lastActivityTime > WORKFLOW_TTL_IN_MS) {
            console.log(`[processEvent] Workflow TTL expired after ${WORKFLOW_TTL_IN_MS}ms of inactivity`);
            break;
        }
    }
}
