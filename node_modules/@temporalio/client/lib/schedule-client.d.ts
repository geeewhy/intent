import { Workflow } from '@temporalio/common';
import { Headers } from '@temporalio/common/lib/interceptors';
import { temporal } from '@temporalio/proto';
import { CreateScheduleInput, CreateScheduleOutput, ScheduleClientInterceptor } from './interceptors';
import { WorkflowService } from './types';
import { Backfill, CompiledScheduleUpdateOptions, ScheduleSummary, ScheduleDescription, ScheduleOptions, ScheduleOverlapPolicy, ScheduleUpdateOptions, ScheduleOptionsStartWorkflowAction } from './schedule-types';
import { BaseClient, BaseClientOptions, LoadedWithDefaults } from './base-client';
/**
 * Handle to a single Schedule
 */
export interface ScheduleHandle {
    /**
     * This Schedule's identifier
     */
    readonly scheduleId: string;
    /**
     * Fetch the Schedule's description from the Server
     */
    describe(): Promise<ScheduleDescription>;
    /**
     * Update the Schedule
     *
     * This function calls `.describe()`, provides the `Schedule` to the provided `updateFn`, and
     * sends the returned `UpdatedSchedule` to the Server to update the Schedule definition. Note that,
     * in the future, `updateFn` might be invoked multiple time, with identical or different input.
     */
    update<W extends Workflow = Workflow>(updateFn: (previous: ScheduleDescription) => ScheduleUpdateOptions<ScheduleOptionsStartWorkflowAction<W>>): Promise<void>;
    /**
     * Delete the Schedule
     */
    delete(): Promise<void>;
    /**
     * Trigger an Action to be taken immediately
     *
     * @param overlap Override the Overlap Policy for this one trigger. Defaults to {@link ScheduleOverlapPolicy.ALLOW_ALL}.
     */
    trigger(overlap?: ScheduleOverlapPolicy): Promise<void>;
    /**
     * Run though the specified time period(s) and take Actions as if that time passed by right now, all at once.
     * The Overlap Policy can be overridden for the scope of the Backfill.
     */
    backfill(options: Backfill | Backfill[]): Promise<void>;
    /**
     * Pause the Schedule
     *
     * @param note A new {@link ScheduleDescription.note}. Defaults to `"Paused via TypeScript SDK"`
     */
    pause(note?: string): Promise<void>;
    /**
     * Unpause the Schedule
     *
     * @param note A new {@link ScheduleDescription.note}. Defaults to `"Unpaused via TypeScript SDK"
     */
    unpause(note?: string): Promise<void>;
    /**
     * Readonly accessor to the underlying ScheduleClient
     */
    readonly client: ScheduleClient;
}
export interface ScheduleClientOptions extends BaseClientOptions {
    /**
     * Used to override and extend default Connection functionality
     *
     * Useful for injecting auth headers and tracing Workflow executions
     */
    interceptors?: ScheduleClientInterceptor[];
}
export type LoadedScheduleClientOptions = LoadedWithDefaults<ScheduleClientOptions>;
export interface ListScheduleOptions {
    /**
     * How many results to fetch from the Server at a time.
     * @default 1000
     */
    pageSize?: number;
    /**
     * Filter schedules by a query string.
     */
    query?: string;
}
/**
 * Client for starting Workflow executions and creating Workflow handles
 */
export declare class ScheduleClient extends BaseClient {
    readonly options: LoadedScheduleClientOptions;
    constructor(options?: ScheduleClientOptions);
    /**
     * Raw gRPC access to the Temporal service. Schedule-related methods are included in {@link WorkflowService}.
     *
     * **NOTE**: The namespace provided in {@link options} is **not** automatically set on requests made to the service.
     */
    get workflowService(): WorkflowService;
    /**
     * Create a new Schedule.
     *
     * @throws {@link ScheduleAlreadyRunning} if there's a running (not deleted) Schedule with the given `id`
     * @returns a ScheduleHandle to the created Schedule
     */
    create<W extends Workflow = Workflow>(options: ScheduleOptions<ScheduleOptionsStartWorkflowAction<W>>): Promise<ScheduleHandle>;
    /**
     * Create a new Schedule.
     */
    protected _createSchedule(options: ScheduleOptions): Promise<void>;
    /**
     * Create a new Schedule.
     */
    protected _createScheduleHandler(input: CreateScheduleInput): Promise<CreateScheduleOutput>;
    /**
     * Describe a Schedule.
     */
    protected _describeSchedule(scheduleId: string): Promise<temporal.api.workflowservice.v1.IDescribeScheduleResponse>;
    /**
     * Update a Schedule.
     */
    protected _updateSchedule(scheduleId: string, opts: CompiledScheduleUpdateOptions, header: Headers): Promise<temporal.api.workflowservice.v1.IUpdateScheduleResponse>;
    /**
     * Patch a Schedule.
     */
    protected _patchSchedule(scheduleId: string, patch: temporal.api.schedule.v1.ISchedulePatch): Promise<temporal.api.workflowservice.v1.IPatchScheduleResponse>;
    /**
     * Delete a Schedule.
     */
    protected _deleteSchedule(scheduleId: string): Promise<temporal.api.workflowservice.v1.IDeleteScheduleResponse>;
    /**
     * List Schedules with an `AsyncIterator`:
     *
     * ```ts
     * for await (const schedule: Schedule of client.list()) {
     *   const { id, memo, searchAttributes } = schedule
     *   // ...
     * }
     * ```
     *
     * To list one page at a time, instead use the raw gRPC method {@link WorkflowService.listSchedules}:
     *
     * ```ts
     * await { schedules, nextPageToken } = client.scheduleService.listSchedules()
     * ```
     */
    list(options?: ListScheduleOptions): AsyncIterable<ScheduleSummary>;
    /**
     * Get a handle to a Schedule
     *
     * This method does not validate `scheduleId`. If there is no Schedule with the given `scheduleId`, handle
     * methods like `handle.describe()` will throw a {@link ScheduleNotFoundError} error.
     */
    getHandle(scheduleId: string): ScheduleHandle;
    protected rethrowGrpcError(err: unknown, fallbackMessage: string, scheduleId?: string): never;
}
/**
 * Thrown from {@link ScheduleClient.create} if there's a running (not deleted) Schedule with the given `id`.
 */
export declare class ScheduleAlreadyRunning extends Error {
    readonly scheduleId: string;
    constructor(message: string, scheduleId: string);
}
/**
 * Thrown when a Schedule with the given Id is not known to Temporal Server.
 * It could be because:
 * - Id passed is incorrect
 * - Schedule was deleted
 */
export declare class ScheduleNotFoundError extends Error {
    readonly scheduleId: string;
    constructor(message: string, scheduleId: string);
}
