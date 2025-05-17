"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerUnfinishedPolicy = void 0;
/**
 * Policy defining actions taken when a workflow exits while update or signal handlers are running.
 * The workflow exit may be due to successful return, failure, cancellation, or continue-as-new.
 */
exports.HandlerUnfinishedPolicy = {
    /**
     * Issue a warning in addition to abandoning the handler execution. The warning will not be issued if the workflow fails.
     */
    WARN_AND_ABANDON: 'WARN_AND_ABANDON',
    /**
     * Abandon the handler execution.
     *
     * In the case of an update handler this means that the client will receive an error rather than
     * the update result.
     */
    ABANDON: 'ABANDON',
};
//# sourceMappingURL=interfaces.js.map