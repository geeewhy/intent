"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.untrackPromise = untrackPromise;
const global_attributes_1 = require("./global-attributes");
/**
 * Helper function to remove a promise from being tracked for stack trace query purposes
 */
function untrackPromise(promise) {
    const store = (0, global_attributes_1.maybeGetActivatorUntyped)()?.promiseStackStore;
    if (!store)
        return;
    store.childToParent.delete(promise);
    store.promiseToStack.delete(promise);
}
//# sourceMappingURL=stack-helpers.js.map