import { Next, WorkflowExecuteInput, WorkflowInboundCallsInterceptor, WorkflowOutboundCallsInterceptor, WorkflowInterceptorsFactory, GetLogAttributesInput } from '@temporalio/workflow';
/**
 * This interceptor used to be meant to log Workflow execution starts and completions, and attaches log attributes to
 * `workflow.log` calls. It is now deprecated and behaves as a noop in all cases. It is only kept arround to avoid
 * breaking code out there that was previously refering to it.
 *
 * @deprecated `WorkflowLogInterceptor` is deprecated. Workflow lifecycle events are now automatically logged
 *             by the SDK. To customize workflow log attributes, simply register a custom `WorkflowInterceptors` that
 *             intercepts the `outbound.getLogAttributes()` method.
 */
export declare class WorkflowLogInterceptor implements WorkflowInboundCallsInterceptor, WorkflowOutboundCallsInterceptor {
    getLogAttributes(input: GetLogAttributesInput, next: Next<WorkflowOutboundCallsInterceptor, 'getLogAttributes'>): Record<string, unknown>;
    execute(input: WorkflowExecuteInput, next: Next<WorkflowInboundCallsInterceptor, 'execute'>): Promise<unknown>;
}
/**
 * @deprecated `WorkflowInboundLogInterceptor` is deprecated. Workflow lifecycle events are now automatically logged
 *             by the SDK. To customize workflow log attributes, simply register a custom `WorkflowInterceptors` that
 *             intercepts the `outbound.getLogAttributes()` method.
 */
export declare const WorkflowInboundLogInterceptor: typeof WorkflowLogInterceptor;
export declare const interceptors: WorkflowInterceptorsFactory;
