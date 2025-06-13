/**
 * Command bus and command handler interfaces
 */
import { Command, Event, CommandHandler } from './contracts';
import { BaseAggregate } from "./base/aggregate";
/**
 * Command bus
 * Routes commands to the appropriate handler
 */
export declare class CommandBus {
    private handlers;
    /**
     * Create a new command bus
     * Automatically loads all registered command handlers from the registry
     */
    constructor();
    /**
     * Register a command handler
     * @param handler The command handler to register
     */
    register(handler: CommandHandler): void;
    /**
     * Dispatch a command with an aggregate
     * @param cmd
     * @param aggregate
     */
    dispatchWithAggregate(cmd: Command, aggregate: BaseAggregate<any>): Promise<Event[]>;
}
