//src/infra/temporal/activities/coreActivities.ts
import type {Command, Event, UUID} from '../../../core/contracts';
import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {v4 as uuidv4} from 'uuid';
import {PgEventStore} from '../../pg/pg-event-store';
import {getAggregateClass, supportsAggregateType, createAggregatePayload} from '../../../core/aggregates';
import {BusinessRuleViolation} from '../../../core/errors';

dotenv.config();

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
        .from('commands')
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
            return AggregateClass.create(createAggregatePayload(aggregateType, aggregateId));
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
 * Execute a command on an aggregate
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 * @param command Command to execute
 * @returns Events produced by the command
 */
export async function executeCommand(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    command: Command
): Promise<{ events?: Event[], status?: string, error?: string }> {
    console.log(`[executeCommand] Executing ${command.type} on ${aggregateType}:${aggregateId}`);

    try {
        // Load the aggregate
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);

        if (!aggregate) {
            throw new Error(`Aggregate ${aggregateType}:${aggregateId} not found and could not be created`);
        }

        console.log(`[executeCommand] Loaded aggregate state: ${aggregate ? 'exists' : 'new'}`);

        // Execute the command on the aggregate
        let events: Event[] = [];

        // Check if the aggregate has a handle method
        if (typeof aggregate.handle === 'function') {
            // Use the aggregate's handle method
            events = aggregate.handle(command);
            console.log(`[executeCommand] Command executed on aggregate, produced ${events.length} events`);
        } else {
            throw new Error(`Aggregate ${aggregateType} does not have a handle method`);
        }

        if (events.length === 0) {
            console.log(`[executeCommand] Command produced no events`);
            return {events: []};
        }

        // Get the current version from the aggregate
        const currentVersion = aggregate.getVersion ? aggregate.getVersion() : 0;

        // Append the events to the event store
        await eventStore.append(tenantId, aggregateType, aggregateId, events, currentVersion);

        console.log(`[executeCommand] Command executed, produced ${events.length} events`);
        return {events};
    } catch (error) {
        console.error(`[executeCommand] Error executing command ${command.type}:`, error);

        // Check if this is a business rule violation
        if (error instanceof BusinessRuleViolation) {
            console.log(`[executeCommand] Business rule violation: ${error.reason}`);
            return {status: 'fail', error: error.reason};
        }

        // For unexpected errors, rethrow to fail the workflow
        throw error;
    }
}

/**
 * Apply an event to an aggregate
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 * @param event Event to apply
 * @returns Additional events produced as a result of applying the event
 */
export async function applyEvent(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    event: Event
): Promise<Event[]> {
    console.log(`[applyEvent] Applying ${event.type} to ${aggregateType}:${aggregateId}`);

    try {
        // Load the aggregate
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);

        if (!aggregate) {
            throw new Error(`Aggregate ${aggregateType}:${aggregateId} not found and could not be created`);
        }

        // Apply the event to the aggregate
        if (typeof aggregate.apply === 'function') {
            // Use the aggregate's apply method
            aggregate.apply(event);
            console.log(`[applyEvent] Event applied to aggregate: ${event.type}`);
        } else {
            throw new Error(`Aggregate ${aggregateType} does not have an apply method`);
        }

        // Get the current version from the aggregate
        const currentVersion = aggregate.getVersion ? aggregate.getVersion() : 0;

        // Store the event in the event store
        await eventStore.append(tenantId, aggregateType, aggregateId, [event], currentVersion - 1);

        console.log(`[applyEvent] Event applied and stored: ${event.type}`);
        return [];
    } catch (error) {
        console.error(`[applyEvent] Error applying event ${event.type}:`, error);
        throw error;
    }
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
    aggregateId: UUID
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
 * Publish events to the EventStore
 * @param events Events to publish
 */
export async function publishEvents(events: Event[]): Promise<void> {
    console.log(`[publishEvents] Publishing ${events.length} events`);

    try {
        for (const event of events) {
            const {tenant_id, aggregateId} = event;
            const aggregateType = event.payload.aggregateType;

            // Load the aggregate to get the current version
            // We pass 0 as fromVersion to load all events
            const result = await eventStore.load(tenant_id, aggregateType, aggregateId, 0);
            const currentVersion = result ? result.version : 0;

            // Append the event to the event store
            await eventStore.append(tenant_id, aggregateType, aggregateId, [event], currentVersion);

            console.log(`[publishEvents] Published event: ${event.type}`);
        }
    } catch (error) {
        console.error(`[publishEvents] Error publishing events:`, error);
        throw error;
    }
}
