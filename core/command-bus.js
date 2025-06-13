"use strict";
//src/core/command-bus.ts
/**
 * Command bus and command handler interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
const logger_1 = require("./logger");
const registry_1 = require("./registry");
/**
 * Command bus
 * Routes commands to the appropriate handler
 */
class CommandBus {
    /**
     * Create a new command bus
     * Automatically loads all registered command handlers from the registry
     */
    constructor() {
        this.handlers = [];
        // Load handlers from registry
        const registeredHandlers = (0, registry_1.getAllCommandHandlers)();
        Object.values(registeredHandlers).forEach(handler => {
            this.register(handler);
        });
    }
    /**
     * Register a command handler
     * @param handler The command handler to register
     */
    register(handler) {
        const logger = (0, logger_1.createLoggerForCommandHandler)(handler);
        logger?.info('Registering handler');
        this.handlers.push(handler);
    }
    /**
     * Dispatch a command with an aggregate
     * @param cmd
     * @param aggregate
     */
    async dispatchWithAggregate(cmd, aggregate) {
        // Use generic logger with context
        const logger = (0, logger_1.log)()?.child({
            commandId: cmd.id,
            commandType: cmd.type,
            tenantId: cmd.tenant_id
        });
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
                throw new Error(`Command payload validation failed: ${validationError.message}`);
            }
        }
        else {
            logger?.warn('No schema found for command type', { commandType: cmd.type });
        }
        const handler = this.handlers.find(h => h.supportsCommand(cmd));
        if (!handler) {
            const err = new Error(`No handler for command: ${cmd.type}`);
            logger?.error('No handler for command', { error: err });
            throw err;
        }
        const cmdTenant = cmd.tenant_id;
        const payloadTenant = cmd.payload?.tenantId;
        if (payloadTenant && payloadTenant !== cmdTenant) {
            const err = new Error(`Mismatch between command.tenant_id and payload.tenantId`);
            logger?.error('Tenant mismatch', {
                commandTenant: cmdTenant,
                payloadTenant,
                error: err
            });
            throw err;
        }
        const handlerLogger = (0, logger_1.createLoggerForCommandHandler)(handler);
        handlerLogger?.debug('Dispatching command', { commandType: cmd.type });
        return await handler.handleWithAggregate(cmd, aggregate);
    }
}
exports.CommandBus = CommandBus;
//# sourceMappingURL=command-bus.js.map