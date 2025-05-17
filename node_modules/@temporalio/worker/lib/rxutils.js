"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMapWithState = mergeMapWithState;
exports.mapWithState = mapWithState;
exports.closeableGroupBy = closeableGroupBy;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function mergeMapWithState(fn, initialState, concurrency = 1) {
    return (0, rxjs_1.pipe)((0, operators_1.mergeScan)(({ state }, input) => fn(state, input), { state: initialState }, concurrency), 
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (0, operators_1.map)(({ output }) => output));
}
function mapWithState(fn, initialState) {
    return (0, rxjs_1.pipe)((0, operators_1.scan)(({ state }, input) => fn(state, input), {
        state: initialState,
    }), 
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (0, operators_1.map)(({ output }) => output));
}
/**
 * An RX OperatorFunction similar to `groupBy`.
 * The returned GroupedObservable has a `close()` method.
 */
function closeableGroupBy(keyFunc) {
    const keyToSubject = new Map();
    return (0, rxjs_1.pipe)((0, operators_1.groupBy)(keyFunc, {
        duration: (group$) => {
            // Duration selector function, the group will close when this subject emits a value
            const subject = new rxjs_1.Subject();
            keyToSubject.set(group$.key, subject);
            return subject;
        },
    }), (0, operators_1.map)((group$) => {
        group$.close = () => {
            const subject = keyToSubject.get(group$.key);
            if (subject !== undefined) {
                subject.next();
                keyToSubject.delete(group$.key);
            }
        };
        return group$;
    }));
}
//# sourceMappingURL=rxutils.js.map