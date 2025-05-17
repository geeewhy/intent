import { HistoryAndWorkflowId } from '@temporalio/client';
import { coresdk } from '@temporalio/proto';
import { DeterminismViolationError } from '@temporalio/workflow';
export type EvictionReason = coresdk.workflow_activation.RemoveFromCache.EvictionReason;
export declare const EvictionReason: typeof coresdk.workflow_activation.RemoveFromCache.EvictionReason;
export type RemoveFromCache = coresdk.workflow_activation.IRemoveFromCache;
/**
 * Error thrown when using the Worker to replay Workflow(s).
 */
export declare class ReplayError extends Error {
}
/**
 * Result of a single workflow replay
 */
export interface ReplayResult {
    readonly workflowId: string;
    readonly runId: string;
    readonly error?: ReplayError | DeterminismViolationError;
}
/**
 * An iterable on workflow histories and their IDs, used for batch replaying.
 */
export type ReplayHistoriesIterable = AsyncIterable<HistoryAndWorkflowId> | Iterable<HistoryAndWorkflowId>;
/**
 * Handles known possible cases of replay eviction reasons.
 *
 * Internally does not return undefined to get compilation errors when new reasons are added to the enum.
 *
 * @internal
 */
export declare function evictionReasonToReplayError(evictJob: RemoveFromCache): ReplayError | DeterminismViolationError | undefined;
