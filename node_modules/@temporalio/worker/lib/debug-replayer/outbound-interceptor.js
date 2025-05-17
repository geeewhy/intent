"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interceptors = void 0;
const workflow_notifier_1 = require("./workflow-notifier");
const interceptors = () => ({
    outbound: [
        {
            async scheduleActivity(input, next) {
                try {
                    return await next(input);
                }
                finally {
                    (0, workflow_notifier_1.notifyRunner)();
                }
            },
            async scheduleLocalActivity(input, next) {
                try {
                    return await next(input);
                }
                finally {
                    (0, workflow_notifier_1.notifyRunner)();
                }
            },
            async startTimer(input, next) {
                try {
                    return await next(input);
                }
                finally {
                    (0, workflow_notifier_1.notifyRunner)();
                }
            },
            async signalWorkflow(input, next) {
                try {
                    return await next(input);
                }
                finally {
                    (0, workflow_notifier_1.notifyRunner)();
                }
            },
            async startChildWorkflowExecution(input, next) {
                const [startPromise, completePromise] = await next(input);
                startPromise.finally(workflow_notifier_1.notifyRunner).catch(() => { });
                completePromise.finally(workflow_notifier_1.notifyRunner).catch(() => { });
                return [startPromise, completePromise];
            },
        },
    ],
});
exports.interceptors = interceptors;
//# sourceMappingURL=outbound-interceptor.js.map