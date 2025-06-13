import { Command, Event } from '../../core/contracts';
import { CommandHandler } from '../../core/contracts';
import { EventHandler } from '../../core/contracts';
import { BaseAggregate } from "../../core/base/aggregate";
import { CommandResult } from "../contracts";
/**
 * Unified workflow router for aggregates and sagas
 */
export declare class WorkflowRouter implements CommandHandler, EventHandler {
    private readonly client;
    private constructor();
    /** factory */
    static create(connectionCfg?: any): Promise<WorkflowRouter>;
    /** Supports command routing (aggregate or saga) */
    supportsCommand(cmd: Command): boolean;
    /** Supports event routing */
    supportsEvent(event: Event): event is Event;
    /** Handle a command (always route to aggregate's processCommand workflow) */
    handle(cmd: Command): Promise<CommandResult>;
    handleWithAggregate(cmd: Command, aggregate: BaseAggregate<any>): Promise<Event[]>;
    /** Handle an event for aggregates and sagas */
    on(event: Event): Promise<void>;
    /** Route a command to a saga (process manager) */
    private routeSagaCommand;
    /** Check if a command is for a saga */
    private isSagaCommand;
    /** Check if a command is for an aggregate */
    private isAggregateCommand;
    /** Get workflow ID for aggregates */
    private getAggregateWorkflowId;
}
