//src/infra/temporal/activities/coreActivities.ts
import type {Command, Event, UUID} from '../../../core/contracts';
import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {v4 as uuidv4} from 'uuid';
import {PgEventStore} from '../../pg/pg-event-store';
import {getAggregateClass, supportsAggregateType, createAggregatePayload} from '../../../core/aggregates';
import {BusinessRuleViolation} from '../../../core/errors';
import {WorkflowRouter} from '../workflow-router';
import {getCommandBus} from "../../../core/domains";

dotenv.config();

let router: WorkflowRouter | undefined;

//route the event
export async function routeEvent(event: Event): Promise<void> {
    if (!router) {
        router = await WorkflowRouter.create();
    }
    return router.on(event);
}

// Initialize the event store
const eventStore = new PgEventStore();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {'x-supabase-auth-role': 'service_role'}
        }
    }
);

/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
export async function dispatchCommand(cmd: Command): Promise<void> {
    const {error} = await supabase
        .from('core.commands')
        .insert([{...cmd, status: 'pending', created_at: new Date()}]);

    if (error) {
        console.error(`[dispatchCommand] Failed to insert command ${cmd.type}:`, error);
        throw error;
    }

    console.log(`[dispatchCommand] Dispatched command: ${cmd.type} (${cmd.id})`);
}

/**
 * Generate a UUID
 * Used by workflows for creating new IDs
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Load an aggregate from the event store
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 * @returns The aggregate instance or null if it doesn't exist
 */
export async function loadAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<any | null> {
    console.log(`[loadAggregate] Loading ${aggregateType}:${aggregateId}`);

    try {
        // Check if the aggregate type is supported
        if (!supportsAggregateType(aggregateType)) {
            console.warn(`[loadAggregate] Unsupported aggregate type: ${aggregateType}`);
            return null;
        }

        // Get the aggregate class
        const AggregateClass = getAggregateClass(aggregateType);
        if (!AggregateClass) {
            console.warn(`[loadAggregate] No class found for aggregate type: ${aggregateType}`);
            return null;
        }

        // First, try to load a snapshot
        const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);
        let aggregate = null;
        let fromVersion = 0;

        // If a snapshot exists, create an aggregate instance and apply the snapshot state
        if (snapshot) {
            console.log(`[loadAggregate] Loaded snapshot at version ${snapshot.version} (schema version ${snapshot.schemaVersion})`);
            aggregate = new AggregateClass(aggregateId);
            aggregate.applySnapshotState(snapshot.state, snapshot.schemaVersion);
            aggregate.version = snapshot.version;
            fromVersion = snapshot.version;

            console.log(`[loadAggregate] Loaded snapshot, aggregate`, aggregate);
        }

        // Load events after the snapshot version (or from 0 if no snapshot)
        const result = await eventStore.load(tenantId, aggregateType, aggregateId, fromVersion);

        if (!result && !snapshot) {
            console.log(`[loadAggregate] No events or snapshot found for ${aggregateType}:${aggregateId}`);
            // Create a new instance of the aggregate using a dynamic payload
            let aggregate = AggregateClass.create(createAggregatePayload(aggregateType, aggregateId));
            console.log(`[loadAggregate] Created new aggregate instance:`, aggregate);
            return aggregate;
        }

        // If we have a snapshot but no events, return the aggregate from the snapshot
        if (!result && snapshot) {
            console.log(`[loadAggregate] Using snapshot with no additional events`);
            return aggregate;
        }

        // If we have events but no snapshot, rebuild the aggregate from events
        if (result && !snapshot) {
            console.log(`[loadAggregate] Loaded ${result.events.length} events for ${aggregateType}:${aggregateId}`);
            return AggregateClass.rehydrate(result.events);
        }

        // If we have both a snapshot and events, apply the events to the aggregate
        if (result && snapshot && aggregate) {
            console.log(`[loadAggregate] Applying ${result.events.length} events on top of snapshot`);
            for (const event of result.events) {
                aggregate.apply(event);
            }
            return aggregate;
        }

        // This should never happen, but just in case
        console.warn(`[loadAggregate] Unexpected state in loadAggregate`);
        return null;
    } catch (error) {
        console.error(`[loadAggregate] Error loading aggregate ${aggregateType}:${aggregateId}:`, error);
        throw error;
    }
}

/**
 * Get events for a command without applying them
 * @param cmd
 */
export async function getEventsForCommand(
    cmd: Command
): Promise<{ events?: Event[]; status: 'success' | 'fail'; error?: string }> {
    try {
        const tenantId = cmd.tenant_id;
        const { aggregateType, aggregateId } = cmd.payload;

        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId); // Activity
        const commandBus = getCommandBus();
        const events = await commandBus.dispatchWithAggregate(cmd, aggregate); // Pure

        return { events, status: 'success' };
    } catch (err) {
        if (err instanceof BusinessRuleViolation) {
            return { status: 'fail', error: err.reason };
        }
        throw err;
    }
}

/**
 * Apply a list of events to an aggregate
 * @param tenantId
 * @param aggregateType
 * @param aggregateId
 * @param events
 */
export async function applyEvents(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    events: Event[]
): Promise<void> {
    const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
    for (const evt of events) aggregate.apply(evt);

    const version = aggregate.getVersion();
    await eventStore.append(tenantId, aggregateType, aggregateId, events, version);
}

/**
 * Create a snapshot of the current aggregate state
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 */
export async function snapshotAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
): Promise<void> {
    console.log(`[snapshotAggregate] Creating snapshot for ${aggregateType}:${aggregateId}`);

    try {
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
        if (aggregate) {
            console.log(`[snapshotAggregate] Aggregate loaded, version: ${aggregate.version}, creating snapshot...`);
            await eventStore.snapshotAggregate(tenantId, aggregate);
            console.log(`[snapshotAggregate] Snapshot taken for ${aggregateType}:${aggregateId}`);

            // Verify the snapshot was created
            const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);
            if (snapshot) {
                console.log(`[snapshotAggregate] Verified snapshot exists with version: ${snapshot.version}`);
            } else {
                console.error(`[snapshotAggregate] Failed to verify snapshot for ${aggregateType}:${aggregateId}`);
            }
        } else {
            console.error(`[snapshotAggregate] No aggregate found for ${aggregateType}:${aggregateId}`);
        }
    } catch (error) {
        console.error(`[snapshotAggregate] Error creating snapshot for ${aggregateType}:${aggregateId}:`, error);
        throw error;
    }
}

/**
 * Project events to read models
 * @param events The events to project
 */
export { projectEvents as projectEventsActivity } from '../../../infra/projections/projectEvents';
