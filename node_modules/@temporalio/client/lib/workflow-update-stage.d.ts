import { temporal } from '@temporalio/proto';
export declare const WorkflowUpdateStage: {
    /** Admitted stage. This stage is reached when the server accepts the update request. It is not
     * allowed to wait for this stage when using startUpdate, since the update request has not yet
     * been durably persisted at this stage. */
    readonly ADMITTED: "ADMITTED";
    /** Accepted stage. This stage is reached when a workflow has received the update and either
     * accepted it (i.e. it has passed validation, or there was no validator configured on the update
     * handler) or rejected it. This is currently the only allowed value when using startUpdate. */
    readonly ACCEPTED: "ACCEPTED";
    /** Completed stage. This stage is reached when a workflow has completed processing the
     * update with either a success or failure. */
    readonly COMPLETED: "COMPLETED";
    /**
     * This is not an allowed value.
     * @deprecated
     */
    readonly UNSPECIFIED: undefined;
};
export type WorkflowUpdateStage = (typeof WorkflowUpdateStage)[keyof typeof WorkflowUpdateStage];
export declare const encodeWorkflowUpdateStage: (input: "COMPLETED" | "ADMITTED" | "ACCEPTED" | temporal.api.enums.v1.UpdateWorkflowExecutionLifecycleStage | "UPDATE_WORKFLOW_EXECUTION_LIFECYCLE_STAGE_ADMITTED" | "UPDATE_WORKFLOW_EXECUTION_LIFECYCLE_STAGE_ACCEPTED" | "UPDATE_WORKFLOW_EXECUTION_LIFECYCLE_STAGE_COMPLETED" | null | undefined) => temporal.api.enums.v1.UpdateWorkflowExecutionLifecycleStage | undefined;
