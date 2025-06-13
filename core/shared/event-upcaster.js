"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventUpcasters = void 0;
exports.registerEventUpcaster = registerEventUpcaster;
exports.upcastEvent = upcastEvent;
exports.eventUpcasters = {};
function registerEventUpcaster(eventType, fromSchemaVersion, upcaster) {
    exports.eventUpcasters[eventType] ?? (exports.eventUpcasters[eventType] = {});
    exports.eventUpcasters[eventType][fromSchemaVersion] = upcaster;
}
function upcastEvent(eventType, payload, schemaVersion) {
    const upcaster = exports.eventUpcasters[eventType]?.[schemaVersion];
    return upcaster ? upcaster(payload) : payload;
}
//# sourceMappingURL=event-upcaster.js.map