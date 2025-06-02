//src/infra/temporal/activities/coreActivities.ts
import type {Command, Event, UUID} from '../../../core/contracts';
import { log } from '../../../core/logger';
import dotenv from 'dotenv';
import {v4 as uuidv4} from 'uuid';
import {PgEventStore} from '../../pg/pg-event-store';
import {getAggregateClass, supportsAggregateType, createAggregatePayload} from '../../../core/aggregates';
import {BusinessRuleViolation} from '../../../core/errors';
import {WorkflowRouter} from '../workflow-router';
import {getCommandBus} from "../../../core/domains";
import {CommandResult} from '../../contracts';
import {PgCommandStore} from '../../pg/pg-command-store';
import { createPool } from '../../projections/pg-pool';

let router: WorkflowRouter;

// inits, activities are init at worker runtime
dotenv.config();
const projectionPool = createPool();

/**
 * Project events to read models
 * @param events The events to project
 */
import {projectEvents as projectEventsInfra} from '../../../infra/projections/projectEvents';

export async function projectEvents(events: Event[]) {
    await projectEventsInfra(events, projectionPool);
}

//route the event
export async function routeEvent(event: Event): Promise<void> {
    if (!router) {
        router = await WorkflowRouter.create();
    }
    return router.on(event);
}

//route the command
export async function routeCommand(command: Command): Promise<CommandResult> {
    if (!router) {
        router = await WorkflowRouter.create();
    }
    return router.handle(command);
}


// Initialize the event store
const eventStore = new PgEventStore();
const pgCommandStore = new PgCommandStore();

/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
export async function dispatchCommand(cmd: Command): Promise<void> {
    const logger = log()?.child({
        commandId: cmd.id,
        commandType: cmd.type,
        tenantId: cmd.tenant_id,
        correlationId: cmd.metadata?.correlationId
    });

    try {
        logger?.debug('Upserting command into database');
        await pgCommandStore.upsert(cmd);

        const result: CommandResult = await routeCommand(cmd);

        const infraStatus = result.status === 'success' ? 'consumed' : 'failed';
        await pgCommandStore.markStatus(cmd.id, infraStatus, result);

        logger?.info('Command dispatched successfully', { status: infraStatus });
    } catch (error: any) {
        await pgCommandStore.markStatus(cmd.id, 'failed', {status: 'fail', error: error.message});
        logger?.error('Failed to dispatch command', { error });
        throw error;
    }
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
    const logger = log()?.child({
        tenantId,
        aggregateType,
        aggregateId
    });

    logger?.debug('Loading aggregate');

    try {
        // Check if the aggregate type is supported
        if (!supportsAggregateType(aggregateType)) {
            logger?.warn('Unsupported aggregate type');
            return null;
        }

        // Get the aggregate class
        const AggregateClass = getAggregateClass(aggregateType);
        if (!AggregateClass) {
            logger?.warn('No class found for aggregate type');
            return null;
        }

        // First, try to load a snapshot
        const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);
        let aggregate = null;
        let fromVersion = 0;

        // If a snapshot exists, create an aggregate instance and apply the snapshot state
        if (snapshot) {
            logger?.debug('Loaded snapshot', { 
                version: snapshot.version, 
                schemaVersion: snapshot.schemaVersion 
            });

            aggregate = new AggregateClass(aggregateId);
            aggregate.applySnapshotState(snapshot.state, snapshot.schemaVersion);
            aggregate.version = snapshot.version;
            fromVersion = snapshot.version;

            logger?.debug('Applied snapshot state to aggregate');
        }

        // Load events after the snapshot version (or from 0 if no snapshot)
        const result = await eventStore.load(tenantId, aggregateType, aggregateId, fromVersion);

        if (!result && !snapshot) {
            logger?.debug('No events or snapshot found, creating new aggregate instance');
            // Create a new instance of the aggregate using a dynamic payload
            let aggregate = AggregateClass.create(createAggregatePayload(aggregateType, aggregateId));
            logger?.info('Created new aggregate instance');
            return aggregate;
        }

        // If we have a snapshot but no events, return the aggregate from the snapshot
        if (!result && snapshot) {
            logger?.debug('Using snapshot with no additional events');
            return aggregate;
        }

        // If we have events but no snapshot, rebuild the aggregate from events
        if (result && !snapshot) {
            logger?.debug('Rebuilding aggregate from events', { eventCount: result.events.length });
            return AggregateClass.rehydrate(result.events);
        }

        // If we have both a snapshot and events, apply the events to the aggregate
        if (result && snapshot && aggregate) {
            logger?.debug('Applying events on top of snapshot', { eventCount: result.events.length });
            for (const event of result.events) {
                aggregate.apply(event);
            }
            return aggregate;
        }

        // This should never happen, but just in case
        logger?.warn('Unexpected state in loadAggregate');
        return null;
    } catch (error) {
        logger?.error('Error loading aggregate', { error });
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
        const {aggregateType, aggregateId} = cmd.payload;

        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId); // Activity
        const commandBus = getCommandBus();
        const events = await commandBus.dispatchWithAggregate(cmd, aggregate); // Pure

        return {events, status: 'success'};
    } catch (err) {
        if (err instanceof BusinessRuleViolation) {
            return {status: 'fail', error: err.reason};
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
// src/infra/temporal/activities/coreActivities.ts (applyEvents)

export async function applyEvents(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    events: Event[],
): Promise<void> {
    const logger = log()?.child({
        tenantId,
        aggregateType,
        aggregateId,
        eventCount: events.length
    });

    logger?.debug('Applying events');

    try {
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);

        const currentVersion = aggregate.getVersion();
        for (const evt of events) aggregate.apply(evt);
        const newVersion = aggregate.getVersion();

        logger?.debug('Events applied to aggregate', { 
            currentVersion, 
            newVersion 
        });

        const snapshot = {
            id: aggregate.id,
            type: aggregateType,
            version: newVersion,
            state: aggregate.extractSnapshotState(),
            schemaVersion: (aggregate.constructor as any).CURRENT_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
        };

        await eventStore.append(
            tenantId,
            aggregateType,
            aggregateId,
            events,
            currentVersion,
            snapshot,
        );

        logger?.info('Events applied successfully');
    } catch (error) {
        logger?.error('Failed to apply events', { error });
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
    aggregateId: UUID,
): Promise<void> {
    const logger = log()?.child({
        tenantId,
        aggregateType,
        aggregateId
    });

    logger?.debug('Creating snapshot');

    try {
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
        if (aggregate) {
            logger?.debug('Aggregate loaded, creating snapshot', { 
                version: aggregate.version 
            });

            await eventStore.snapshotAggregate(tenantId, aggregate);
            logger?.info('Snapshot taken');

            // Verify the snapshot was created
            const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);
            if (snapshot) {
                logger?.debug('Verified snapshot exists', { 
                    version: snapshot.version 
                });
            } else {
                logger?.error('Failed to verify snapshot');
            }
        } else {
            logger?.error('No aggregate found');
        }
    } catch (error) {
        logger?.error('Error creating snapshot', { error });
        throw error;
    }
}
