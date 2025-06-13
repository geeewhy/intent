"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToLogs = subscribeToLogs;
exports.broadcastLog = broadcastLog;
const subscribers = new Set();
function subscribeToLogs(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}
function broadcastLog(log) {
    for (const fn of subscribers)
        fn(log);
}
//# sourceMappingURL=logBroadcaster.js.map