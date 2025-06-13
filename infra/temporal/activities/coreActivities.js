"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectEvents = projectEvents;
exports.routeEvent = routeEvent;
exports.routeCommand = routeCommand;
exports.dispatchCommand = dispatchCommand;
exports.generateUUID = generateUUID;
exports.loadAggregate = loadAggregate;
exports.getEventsForCommand = getEventsForCommand;
exports.applyEvents = applyEvents;
exports.snapshotAggregate = snapshotAggregate;
const logger_1 = require("../../../core/logger");
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const pg_event_store_1 = require("../../pg/pg-event-store");
const aggregates_1 = require("../../../core/aggregates");
const errors_1 = require("../../../core/errors");
const workflow_router_1 = require("../workflow-router");
const command_bus_1 = require("../../../core/command-bus");
const pg_command_store_1 = require("../../pg/pg-command-store");
const pg_pool_1 = require("../../projections/pg-pool");
const initialize_1 = require("../../../core/initialize");
const registry_1 = require("../../../core/registry");
let router;
// inits, activities are init at worker runtime
dotenv_1.default.config();
const projectionPool = (0, pg_pool_1.createPool)();
void (0, initialize_1.initializeCore)();
const commandBus = new command_bus_1.CommandBus();
/**
 * Project events to read models
 * @param events The events to project
 */
const projectEvents_1 = require("../../../infra/projections/projectEvents");
async function projectEvents(events) {
    await (0, projectEvents_1.projectEvents)(events, projectionPool);
}
//route the event
async function routeEvent(event) {
    if (!router) {
        router = await workflow_router_1.WorkflowRouter.create();
    }
    return router.on(event);
}
//route the command
async function routeCommand(command) {
    if (!router) {
        router = await workflow_router_1.WorkflowRouter.create();
    }
    return router.handle(command);
}
// Initialize the event store
const eventStore = new pg_event_store_1.PgEventStore();
const pgCommandStore = new pg_command_store_1.PgCommandStore();
/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
async function dispatchCommand(cmd) {
    const logger = (0, logger_1.log)()?.child({
        commandId: cmd.id,
        commandType: cmd.type,
        tenantId: cmd.tenant_id,
        correlationId: cmd.metadata?.correlationId
    });
    try {
        // Validate command payload against schema
        const commandMeta = registry_1.DomainRegistry.commandTypes()[cmd.type];
        if (commandMeta?.payloadSchema) {
            try {
                logger?.debug('Validating command payload against schema');
                commandMeta.payloadSchema.parse(cmd.payload);
                logger?.debug('Command payload validation successful');
            }
            catch (validationError) {
                logger?.error('Command payload validation failed', {
                    error: validationError,
                    issues: validationError.errors || validationError.issues
                });
                const err = new Error(`Command payload validation failed: ${validationError.message}`);
                await pgCommandStore.markStatus(cmd.id, 'failed', {
                    status: 'fail',
                    error: err
                });
                throw err;
            }
        }
        else {
            logger?.warn('No schema found for command type', { commandType: cmd.type });
        }
        logger?.debug('Upserting command into database');
        await pgCommandStore.upsert(cmd);
        const result = await routeCommand(cmd);
        const infraStatus = result.status === 'success' ? 'consumed' : 'failed';
        await pgCommandStore.markStatus(cmd.id, infraStatus, result);
        logger?.info('Command dispatched successfully', { status: infraStatus });
    }
    catch (error) {
        await pgCommandStore.markStatus(cmd.id, 'failed', { status: 'fail', error: error.message });
        logger?.error('Failed to dispatch command', { error });
        throw error;
    }
}
/**
 * Generate a UUID
 * Used by workflows for creating new IDs
 */
function generateUUID() {
    return (0, uuid_1.v4)();
}
/**
 * Load an aggregate from the event store
 * @param tenantId Tenant ID
 * @param aggregateType Type of the aggregate
 * @param aggregateId ID of the aggregate
 * @returns The aggregate instance or null if it doesn't exist
 */
async function loadAggregate(tenantId, aggregateType, aggregateId) {
    const logger = (0, logger_1.log)()?.child({
        tenantId,
        aggregateType,
        aggregateId
    });
    logger?.debug('Loading aggregate');
    try {
        // Check if the aggregate type is supported
        if (!(0, aggregates_1.supportsAggregateType)(aggregateType)) {
            logger?.warn('Unsupported aggregate type');
            return null;
        }
        // Get the aggregate class
        const AggregateClass = (0, aggregates_1.getAggregateClass)(aggregateType);
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
            let aggregate = AggregateClass.create((0, aggregates_1.createAggregatePayload)(aggregateType, aggregateId));
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
    }
    catch (error) {
        logger?.error('Error loading aggregate', { error });
        throw error;
    }
}
/**
 * Get events for a command without applying them
 * @param cmd
 */
async function getEventsForCommand(cmd) {
    try {
        const tenantId = cmd.tenant_id;
        const { aggregateType, aggregateId } = cmd.payload;
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId); // Activity
        const events = await commandBus.dispatchWithAggregate(cmd, aggregate); // Pure
        return { events, status: 'success' };
    }
    catch (err) {
        if (err instanceof errors_1.BusinessRuleViolation) {
            return { status: 'fail', error: err };
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
async function applyEvents(tenantId, aggregateType, aggregateId, events) {
    const logger = (0, logger_1.log)()?.child({
        tenantId,
        aggregateType,
        aggregateId,
        eventCount: events.length
    });
    logger?.debug('Applying events');
    try {
        const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
        const currentVersion = aggregate.getVersion();
        for (const evt of events)
            aggregate.apply(evt);
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
            schemaVersion: aggregate.constructor.CURRENT_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
        };
        await eventStore.append(tenantId, aggregateType, aggregateId, events, currentVersion, snapshot);
        logger?.info('Events applied successfully');
    }
    catch (error) {
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
async function snapshotAggregate(tenantId, aggregateType, aggregateId) {
    const logger = (0, logger_1.log)()?.child({
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
            }
            else {
                logger?.error('Failed to verify snapshot');
            }
        }
        else {
            logger?.error('No aggregate found');
        }
    }
    catch (error) {
        logger?.error('Error creating snapshot', { error });
        throw error;
    }
}
//# sourceMappingURL=coreActivities.js.map