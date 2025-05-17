"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeGetActivatorUntyped = maybeGetActivatorUntyped;
exports.setActivatorUntyped = setActivatorUntyped;
exports.maybeGetActivator = maybeGetActivator;
exports.assertInWorkflowContext = assertInWorkflowContext;
exports.getActivator = getActivator;
const common_1 = require("@temporalio/common");
function maybeGetActivatorUntyped() {
    return globalThis.__TEMPORAL_ACTIVATOR__;
}
function setActivatorUntyped(activator) {
    globalThis.__TEMPORAL_ACTIVATOR__ = activator;
}
function maybeGetActivator() {
    return maybeGetActivatorUntyped();
}
function assertInWorkflowContext(message) {
    const activator = maybeGetActivator();
    if (activator == null)
        throw new common_1.IllegalStateError(message);
    return activator;
}
function getActivator() {
    const activator = maybeGetActivator();
    if (activator === undefined) {
        throw new common_1.IllegalStateError('Workflow uninitialized');
    }
    return activator;
}
//# sourceMappingURL=global-attributes.js.map