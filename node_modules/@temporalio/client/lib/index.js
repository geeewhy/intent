"use strict";
/**
 * Client for communicating with Temporal Server.
 *
 * Most functionality is available through {@link WorkflowClient}, but you can also call gRPC methods directly using {@link Connection.workflowService} and {@link Connection.operatorService}.
 *
 * ### Usage
 * <!--SNIPSTART typescript-hello-client-->
 * <!--SNIPEND-->
 * @module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowUpdateStage = exports.LOCAL_TARGET = exports.Connection = exports.WorkflowExecutionAlreadyStartedError = exports.TimeoutFailure = exports.TerminatedFailure = exports.TemporalFailure = exports.ServerFailure = exports.defaultPayloadConverter = exports.ChildWorkflowFailure = exports.CancelledFailure = exports.ApplicationFailure = exports.ActivityFailure = void 0;
var common_1 = require("@temporalio/common");
Object.defineProperty(exports, "ActivityFailure", { enumerable: true, get: function () { return common_1.ActivityFailure; } });
Object.defineProperty(exports, "ApplicationFailure", { enumerable: true, get: function () { return common_1.ApplicationFailure; } });
Object.defineProperty(exports, "CancelledFailure", { enumerable: true, get: function () { return common_1.CancelledFailure; } });
Object.defineProperty(exports, "ChildWorkflowFailure", { enumerable: true, get: function () { return common_1.ChildWorkflowFailure; } });
Object.defineProperty(exports, "defaultPayloadConverter", { enumerable: true, get: function () { return common_1.defaultPayloadConverter; } });
Object.defineProperty(exports, "ServerFailure", { enumerable: true, get: function () { return common_1.ServerFailure; } });
Object.defineProperty(exports, "TemporalFailure", { enumerable: true, get: function () { return common_1.TemporalFailure; } });
Object.defineProperty(exports, "TerminatedFailure", { enumerable: true, get: function () { return common_1.TerminatedFailure; } });
Object.defineProperty(exports, "TimeoutFailure", { enumerable: true, get: function () { return common_1.TimeoutFailure; } });
Object.defineProperty(exports, "WorkflowExecutionAlreadyStartedError", { enumerable: true, get: function () { return common_1.WorkflowExecutionAlreadyStartedError; } });
__exportStar(require("@temporalio/common/lib/errors"), exports);
__exportStar(require("@temporalio/common/lib/interfaces"), exports);
__exportStar(require("@temporalio/common/lib/workflow-handle"), exports);
__exportStar(require("./async-completion-client"), exports);
__exportStar(require("./client"), exports);
var connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
Object.defineProperty(exports, "LOCAL_TARGET", { enumerable: true, get: function () { return connection_1.LOCAL_TARGET; } });
__exportStar(require("./errors"), exports);
__exportStar(require("./grpc-retry"), exports);
__exportStar(require("./interceptors"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./workflow-client"), exports);
__exportStar(require("./workflow-options"), exports);
__exportStar(require("./schedule-types"), exports);
__exportStar(require("./schedule-client"), exports);
__exportStar(require("./task-queue-client"), exports);
var workflow_update_stage_1 = require("./workflow-update-stage");
Object.defineProperty(exports, "WorkflowUpdateStage", { enumerable: true, get: function () { return workflow_update_stage_1.WorkflowUpdateStage; } });
//# sourceMappingURL=index.js.map