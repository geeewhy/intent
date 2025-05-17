"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interceptors = exports.WorkflowInboundLogInterceptor = exports.WorkflowLogInterceptor = void 0;
/**
 * This interceptor used to be meant to log Workflow execution starts and completions, and attaches log attributes to
 * `workflow.log` calls. It is now deprecated and behaves as a noop in all cases. It is only kept arround to avoid
 * breaking code out there that was previously refering to it.
 *
 * @deprecated `WorkflowLogInterceptor` is deprecated. Workflow lifecycle events are now automatically logged
 *             by the SDK. To customize workflow log attributes, simply register a custom `WorkflowInterceptors` that
 *             intercepts the `outbound.getLogAttributes()` method.
 */
class WorkflowLogInterceptor {
    getLogAttributes(input, next) {
        return next(input);
    }
    execute(input, next) {
        // Logging of workflow's lifecycle events is now handled in `workflow/src/logs.ts`
        return next(input);
    }
}
exports.WorkflowLogInterceptor = WorkflowLogInterceptor;
/**
 * @deprecated `WorkflowInboundLogInterceptor` is deprecated. Workflow lifecycle events are now automatically logged
 *             by the SDK. To customize workflow log attributes, simply register a custom `WorkflowInterceptors` that
 *             intercepts the `outbound.getLogAttributes()` method.
 */
// eslint-disable-next-line deprecation/deprecation
exports.WorkflowInboundLogInterceptor = WorkflowLogInterceptor;
// ts-prune-ignore-next
const interceptors = () => {
    // eslint-disable-next-line deprecation/deprecation
    const interceptor = new WorkflowLogInterceptor();
    return { inbound: [interceptor], outbound: [interceptor] };
};
exports.interceptors = interceptors;
//# sourceMappingURL=workflow-log-interceptor.js.map