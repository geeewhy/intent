import type { Command, Event, UUID } from '../../../core/contracts';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { PgEventStore } from '../../pg/pg-event-store';
import { getAggregateClass, supportsAggregateType, createAggregatePayload } from '../../../core/aggregates';
import { BusinessRuleViolation } from '../../../core/errors';

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
            headers: { 'x-supabase-auth-role': 'service_role' }
        }
    }
);

/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
export async function dispatchCommand(cmd: Command): Promise<void> {
    const { error } = await supabase
        .from('commands')
        .insert([{ ...cmd, status: 'pending', created_at: new Date() }]);

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

        // Load events from the event store
        const result = await eventStore.load(tenantId, aggregateType, aggregateId);

        if (!result || result.events.length === 0) {
            console.log(`[loadAggregate] No events found for ${aggregateType}:${aggregateId}`);

            // Create a new instance of the aggregate using a dynamic payload
            return AggregateClass.create(createAggregatePayload(aggregateType, aggregateId));
        }

        console.log(`[loadAggregate] Loaded ${result.events.length} events for ${aggregateType}:${aggregateId}`);

        // Rebuild the aggregate from events
        const aggregateInstance = AggregateClass.rehydrate(result.events);

        return aggregateInstance;
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
            return { events: [] };
        }

        // Get the current version from the aggregate
        const currentVersion = aggregate.getVersion ? aggregate.getVersion() : 0;

        // Append the events to the event store
        await eventStore.append(tenantId, aggregateType, aggregateId, events, currentVersion);

        console.log(`[executeCommand] Command executed, produced ${events.length} events`);
        return { events };
    } catch (error) {
        console.error(`[executeCommand] Error executing command ${command.type}:`, error);

        // Check if this is a business rule violation
        if (error instanceof BusinessRuleViolation) {
            console.log(`[executeCommand] Business rule violation: ${error.reason}`);
            return { status: 'fail', error: error.reason };
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

        let receivedEvents = [];
        // Apply the event to the aggregate
        if (typeof aggregate.apply === 'function') {
            // Use the aggregate's apply method
            receivedEvents = aggregate.apply(event);
            console.log(`[applyEvent] Event applied to aggregate: ${event.type}`);
        } else {
            throw new Error(`Aggregate ${aggregateType} does not have an apply method`);
        }

        // Get the current version from the aggregate
        const currentVersion = aggregate.getVersion ? aggregate.getVersion() : 0;

        // Append the event to the event store
        if (receivedEvents) {
            await eventStore.append(tenantId, aggregateType, aggregateId, [receivedEvents], currentVersion);
        }

        console.log(`[applyEvent] Event applied and stored: ${event.type}`);
        return [];
    } catch (error) {
        console.error(`[applyEvent] Error applying event ${event.type}:`, error);
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
            const { tenant_id, aggregateId } = event;
            const aggregateType = event.payload.aggregateType;

            // Load the aggregate to get the current version
            const result = await eventStore.load(tenant_id, aggregateType, aggregateId);
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
