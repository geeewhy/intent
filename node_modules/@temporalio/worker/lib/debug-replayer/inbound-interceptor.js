"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interceptors = void 0;
const workflow_notifier_1 = require("./workflow-notifier");
const interceptors = () => ({
    inbound: [
        {
            execute(input, next) {
                (0, workflow_notifier_1.notifyRunner)();
                return next(input);
            },
            handleSignal(input, next) {
                (0, workflow_notifier_1.notifyRunner)();
                return next(input);
            },
        },
    ],
});
exports.interceptors = interceptors;
//# sourceMappingURL=inbound-interceptor.js.map