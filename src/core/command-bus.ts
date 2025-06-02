//src/core/command-bus.ts
/**
 * Command bus and command handler interfaces
 */

import { Command, Event, CommandHandler } from './contracts';
import {log, createLoggerForCommandHandler} from './logger';
import {BaseAggregate} from "./base/aggregate";

/**
 * Command bus
 * Routes commands to the appropriate handler
 */
export class CommandBus {
  private handlers: CommandHandler[] = [];

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
