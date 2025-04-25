/**
 * Command bus and command handler interfaces
 */

import { Command } from './contracts';

/**
 * Command handler interface
 * Each domain service implements this interface to handle specific command types
 */
export interface CommandHandler<C extends Command = Command> {
  /**
   * Check if this handler supports the given command
   * @param cmd The command to check
   * @returns True if this handler supports the command, false otherwise
   */
  supports(cmd: Command): boolean;

  /**
   * Handle the command
   * @param cmd The command to handle
   */
  handle(cmd: C): Promise<void>;
}

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
    this.handlers.push(handler);
  }

  /**
   * Dispatch a command to the appropriate handler
   * @param cmd The command to dispatch
   * @throws Error if no handler is found for the command
   */
  async dispatch(cmd: Command): Promise<void> {
    const handler = this.handlers.find(h => h.supports(cmd));
    if (!handler) {
      throw new Error(`No handler for command type: ${cmd.type}`);
    }
    await handler.handle(cmd);
  }
}
