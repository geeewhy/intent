//src/core/command-bus.ts
/**
 * Command bus and command handler interfaces
 */

import { Command, Event, CommandHandler } from './contracts';
import {log, createLoggerForCommandHandler} from './logger';
import {BaseAggregate} from "./base/aggregate";
import { getAllCommandHandlers, DomainRegistry } from './registry';

/**
 * Command bus
 * Routes commands to the appropriate handler
 */
export class CommandBus {
  private handlers: CommandHandler[] = [];

  /**
   * Create a new command bus
   * Automatically loads all registered command handlers from the registry
   */
  constructor() {
    // Load handlers from registry
    const registeredHandlers = getAllCommandHandlers();
    Object.values(registeredHandlers).forEach(handler => {
      this.register(handler);
    });
  }

  /**
   * Register a command handler
   * @param handler The command handler to register
   */
  register(handler: CommandHandler): void {
    const logger = createLoggerForCommandHandler(handler);
    logger?.info('Registering handler');
    this.handlers.push(handler);
  }

  /**
   * Dispatch a command with an aggregate
   * @param cmd
   * @param aggregate
   */
  async dispatchWithAggregate(cmd: Command, aggregate: BaseAggregate<any>): Promise<Event[]> {
    // Use generic logger with context
    const logger = log()?.child({
      commandId: cmd.id,
      commandType: cmd.type,
      tenantId: cmd.tenant_id
    });

    // Validate command payload against schema
    const commandMeta = DomainRegistry.commandTypes()[cmd.type];
    if (commandMeta?.payloadSchema) {
      try {
        logger?.debug('Validating command payload against schema');
        commandMeta.payloadSchema.parse(cmd.payload);
        logger?.debug('Command payload validation successful');
      } catch (validationError: any) {
        logger?.error('Command payload validation failed', { 
          error: validationError,
          issues: validationError.errors || validationError.issues
        });
        throw new Error(`Command payload validation failed: ${validationError.message}`);
      }
    } else {
      logger?.warn('No schema found for command type', { commandType: cmd.type });
    }

    const handler = this.handlers.find(h => h.supportsCommand(cmd));
    if (!handler) {
      const err = new Error(`No handler for command: ${cmd.type}`);
      logger?.error('No handler for command', { error: err });
      throw err;
    }

    const cmdTenant = cmd.tenant_id;
    const payloadTenant = (cmd.payload as any)?.tenantId;

    if (payloadTenant && payloadTenant !== cmdTenant) {
      const err = new Error(`Mismatch between command.tenant_id and payload.tenantId`);
      logger?.error('Tenant mismatch', {
        commandTenant: cmdTenant,
        payloadTenant,
        error: err
      });
      throw err;
    }

    const handlerLogger = createLoggerForCommandHandler(handler);
    handlerLogger?.debug('Dispatching command', { commandType: cmd.type });

    return await handler.handleWithAggregate(cmd, aggregate);
  }
}
