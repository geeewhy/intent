"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeWorkflowUpdateStage = exports.WorkflowUpdateStage = void 0;
const internal_workflow_1 = require("@temporalio/common/lib/internal-workflow");
exports.WorkflowUpdateStage = {
    /** Admitted stage. This stage is reached when the server accepts the update request. It is not
     * allowed to wait for this stage when using startUpdate, since the update request has not yet
     * been durably persisted at this stage. */
    ADMITTED: 'ADMITTED',
    /** Accepted stage. This stage is reached when a workflow has received the update and either
     * accepted it (i.e. it has passed validation, or there was no validator configured on the update
     * handler) or rejected it. This is currently the only allowed value when using startUpdate. */
    ACCEPTED: 'ACCEPTED',
    /** Completed stage. This stage is reached when a workflow has completed processing the
     * update with either a success or failure. */
    COMPLETED: 'COMPLETED',
    /**
     * This is not an allowed value.
     * @deprecated
     */
    UNSPECIFIED: undefined, // eslint-disable-line deprecation/deprecation
};
exports.encodeWorkflowUpdateStage = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.WorkflowUpdateStage.ADMITTED]: 1,
    [exports.WorkflowUpdateStage.ACCEPTED]: 2,
    [exports.WorkflowUpdateStage.COMPLETED]: 3,
    UNSPECIFIED: 0,
}, 'UPDATE_WORKFLOW_EXECUTION_LIFECYCLE_STAGE_')[0];
//# sourceMappingURL=workflow-update-stage.js.map