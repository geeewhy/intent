"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayError = exports.EvictionReason = void 0;
exports.evictionReasonToReplayError = evictionReasonToReplayError;
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
const proto_1 = require("@temporalio/proto");
const workflow_1 = require("@temporalio/workflow");
exports.EvictionReason = proto_1.coresdk.workflow_activation.RemoveFromCache.EvictionReason;
/**
 * Error thrown when using the Worker to replay Workflow(s).
 */
let ReplayError = class ReplayError extends Error {
};
exports.ReplayError = ReplayError;
exports.ReplayError = ReplayError = __decorate([
    (0, type_helpers_1.SymbolBasedInstanceOfError)('ReplayError')
], ReplayError);
/**
 * Handles known possible cases of replay eviction reasons.
 *
 * Internally does not return undefined to get compilation errors when new reasons are added to the enum.
 *
 * @internal
 */
function evictionReasonToReplayError(evictJob) {
    switch (evictJob.reason) {
        case exports.EvictionReason.NONDETERMINISM:
            return new workflow_1.DeterminismViolationError('Replay failed with a nondeterminism error. This means that the workflow code as written ' +
                `is not compatible with the history that was fed in. Details: ${evictJob.message}`);
        case exports.EvictionReason.LANG_FAIL:
            return new ReplayError(`Replay failed due workflow task failure. Details: ${evictJob.message}`);
        // Both of these reasons are not considered errors.
        // LANG_REQUESTED is used internally by Core to support duplicate runIds during replay.
        case exports.EvictionReason.LANG_REQUESTED:
        case exports.EvictionReason.CACHE_FULL:
            return undefined;
        case undefined:
        case null:
        case exports.EvictionReason.UNSPECIFIED:
        case exports.EvictionReason.CACHE_MISS:
        case exports.EvictionReason.TASK_NOT_FOUND:
        case exports.EvictionReason.UNHANDLED_COMMAND:
        case exports.EvictionReason.PAGINATION_OR_HISTORY_FETCH:
        case exports.EvictionReason.FATAL:
            return new ReplayError(`Replay failed due to internal SDK issue. Code: ${evictJob.reason ? exports.EvictionReason[evictJob.reason] : 'absent'}, Details: ${evictJob.message}`);
    }
}
//# sourceMappingURL=replay.js.map