import { type Sink, type Sinks } from './sinks';
import { WorkflowInfo } from './interfaces';
export interface WorkflowLogger extends Sink {
    trace(message: string, attrs?: Record<string, unknown>): void;
    debug(message: string, attrs?: Record<string, unknown>): void;
    info(message: string, attrs?: Record<string, unknown>): void;
    warn(message: string, attrs?: Record<string, unknown>): void;
    error(message: string, attrs?: Record<string, unknown>): void;
}
/**
 * Sink interface for forwarding logs from the Workflow sandbox to the Worker
 *
 * @deprecated Do not use LoggerSinks directly. To log from Workflow code, use the `log` object
 *             exported by the `@temporalio/workflow` package. To capture log messages emitted
 *             by Workflow code, set the {@link Runtime.logger} property.
 */
export interface LoggerSinksDeprecated extends Sinks {
    /**
     * @deprecated Do not use LoggerSinks directly. To log from Workflow code, use the `log` object
     *             exported by the `@temporalio/workflow` package. To capture log messages emitted
     *             by Workflow code, set the {@link Runtime.logger} property.
     */
    defaultWorkerLogger: WorkflowLogger;
}
/**
 * Sink interface for forwarding logs from the Workflow sandbox to the Worker
 */
export interface LoggerSinksInternal extends Sinks {
    __temporal_logger: WorkflowLogger;
}
/**
 * Default workflow logger.
 *
 * This logger is replay-aware and will omit log messages on workflow replay. Messages emitted by this logger are
 * funnelled through a sink that forwards them to the logger registered on {@link Runtime.logger}.
 *
 * Attributes from the current Workflow Execution context are automatically included as metadata on every log
 * entries. An extra `sdkComponent` metadata attribute is also added, with value `workflow`; this can be used for
 * fine-grained filtering of log entries further downstream.
 *
 * To customize log attributes, register a {@link WorkflowOutboundCallsInterceptor} that intercepts the
 * `getLogAttributes()` method.
 *
 * Notice that since sinks are used to power this logger, any log attributes must be transferable via the
 * {@link https://nodejs.org/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist | postMessage}
 * API.
 *
 * NOTE: Specifying a custom logger through {@link defaultSink} or by manually registering a sink named
 * `defaultWorkerLogger` has been deprecated. Please use {@link Runtime.logger} instead.
 */
export declare const log: WorkflowLogger;
export declare function executeWithLifecycleLogging(fn: () => Promise<unknown>): Promise<unknown>;
/**
 * Returns a map of attributes to be set _by default_ on log messages for a given Workflow.
 * Note that this function may be called from outside of the Workflow context (eg. by the worker itself).
 */
export declare function workflowLogAttributes(info: WorkflowInfo): Record<string, unknown>;
