"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeWorkflowIdConflictPolicy = exports.encodeWorkflowIdConflictPolicy = exports.WorkflowIdConflictPolicy = exports.decodeWorkflowIdReusePolicy = exports.encodeWorkflowIdReusePolicy = exports.WorkflowIdReusePolicy = void 0;
exports.extractWorkflowType = extractWorkflowType;
const internal_workflow_1 = require("./internal-workflow");
/**
 * Defines what happens when trying to start a Workflow with the same ID as a *Closed* Workflow.
 *
 * See {@link WorkflowOptions.workflowIdConflictPolicy} for what happens when trying to start a
 * Workflow with the same ID as a *Running* Workflow.
 *
 * Concept: {@link https://docs.temporal.io/concepts/what-is-a-workflow-id-reuse-policy/ | Workflow Id Reuse Policy}
 *
 * *Note: It is not possible to have two actively running Workflows with the same ID.*
 *
 */
exports.WorkflowIdReusePolicy = {
    /**
     * The Workflow can be started if the previous Workflow is in a Closed state.
     * @default
     */
    ALLOW_DUPLICATE: 'ALLOW_DUPLICATE',
    /**
     * The Workflow can be started if the previous Workflow is in a Closed state that is not Completed.
     */
    ALLOW_DUPLICATE_FAILED_ONLY: 'ALLOW_DUPLICATE_FAILED_ONLY',
    /**
     * The Workflow cannot be started.
     */
    REJECT_DUPLICATE: 'REJECT_DUPLICATE',
    /**
     * Terminate the current Workflow if one is already running; otherwise allow reusing the Workflow ID.
     *
     * @deprecated Use {@link WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE} instead, and
     *             set `WorkflowOptions.workflowIdConflictPolicy` to
     *             {@link WorkflowIdConflictPolicy.WORKFLOW_ID_CONFLICT_POLICY_TERMINATE_EXISTING}.
     *             When using this option, `WorkflowOptions.workflowIdConflictPolicy` must be left unspecified.
     */
    TERMINATE_IF_RUNNING: 'TERMINATE_IF_RUNNING', // eslint-disable-line deprecation/deprecation
    /// Anything below this line has been deprecated
    /**
     * No need to use this. If a `WorkflowIdReusePolicy` is set to this, or is not set at all, the default value will be used.
     *
     * @deprecated Either leave property `undefined`, or use {@link ALLOW_DUPLICATE} instead.
     */
    WORKFLOW_ID_REUSE_POLICY_UNSPECIFIED: undefined, // eslint-disable-line deprecation/deprecation
    /** @deprecated Use {@link ALLOW_DUPLICATE} instead. */
    WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE: 'ALLOW_DUPLICATE', // eslint-disable-line deprecation/deprecation
    /** @deprecated Use {@link ALLOW_DUPLICATE_FAILED_ONLY} instead. */
    WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY: 'ALLOW_DUPLICATE_FAILED_ONLY', // eslint-disable-line deprecation/deprecation
    /** @deprecated Use {@link REJECT_DUPLICATE} instead. */
    WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE: 'REJECT_DUPLICATE', // eslint-disable-line deprecation/deprecation
    /** @deprecated Use {@link TERMINATE_IF_RUNNING} instead. */
    WORKFLOW_ID_REUSE_POLICY_TERMINATE_IF_RUNNING: 'TERMINATE_IF_RUNNING', // eslint-disable-line deprecation/deprecation
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.WorkflowIdReusePolicy.ALLOW_DUPLICATE]: 1,
    [exports.WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY]: 2,
    [exports.WorkflowIdReusePolicy.REJECT_DUPLICATE]: 3,
    [exports.WorkflowIdReusePolicy.TERMINATE_IF_RUNNING]: 4, // eslint-disable-line deprecation/deprecation
    UNSPECIFIED: 0,
}, 'WORKFLOW_ID_REUSE_POLICY_'), exports.encodeWorkflowIdReusePolicy = _a[0], exports.decodeWorkflowIdReusePolicy = _a[1];
exports.WorkflowIdConflictPolicy = {
    /**
     * Do not start a new Workflow. Instead raise a `WorkflowExecutionAlreadyStartedError`.
     */
    FAIL: 'FAIL',
    /**
     * Do not start a new Workflow. Instead return a Workflow Handle for the already Running Workflow.
     */
    USE_EXISTING: 'USE_EXISTING',
    /**
     * Start a new Workflow, terminating the current workflow if one is already running.
     */
    TERMINATE_EXISTING: 'TERMINATE_EXISTING',
};
_b = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.WorkflowIdConflictPolicy.FAIL]: 1,
    [exports.WorkflowIdConflictPolicy.USE_EXISTING]: 2,
    [exports.WorkflowIdConflictPolicy.TERMINATE_EXISTING]: 3,
    UNSPECIFIED: 0,
}, 'WORKFLOW_ID_CONFLICT_POLICY_'), exports.encodeWorkflowIdConflictPolicy = _b[0], exports.decodeWorkflowIdConflictPolicy = _b[1];
function extractWorkflowType(workflowTypeOrFunc) {
    if (typeof workflowTypeOrFunc === 'string')
        return workflowTypeOrFunc;
    if (typeof workflowTypeOrFunc === 'function') {
        if (workflowTypeOrFunc?.name)
            return workflowTypeOrFunc.name;
        throw new TypeError('Invalid workflow type: the workflow function is anonymous');
    }
    throw new TypeError(`Invalid workflow type: expected either a string or a function, got '${typeof workflowTypeOrFunc}'`);
}
//# sourceMappingURL=workflow-options.js.map