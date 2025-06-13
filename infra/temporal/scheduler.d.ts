import { WorkflowClient } from '@temporalio/client';
import { Command, Event } from '../../core/contracts';
import { CommandResult } from "../contracts";
import { JobSchedulerPort, EventPublisherPort } from '../../core/ports';
/**
 * TemporalScheduler - schedules commands and events via Temporal workflows
 */
export declare class Scheduler implements JobSchedulerPort, EventPublisherPort {
    private readonly router;
    private readonly client;
    private readonly commandStore;
    private constructor();
    /** async builder */
    static create(cfg?: any): Promise<Scheduler>;
    /**
     * Get the Temporal client
     * @returns The Temporal client
     */
    getClient(): Promise<WorkflowClient>;
    /**
     * Schedule a command for execution via Temporal
     */
    schedule(cmd: Command): Promise<CommandResult>;
    /**
     * Publish events to aggregates via Temporal
     */
    publish(events: Event[]): Promise<void>;
    close(): Promise<void>;
}
