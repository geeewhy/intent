"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommand = isCommand;
exports.isEvent = isEvent;
exports.isCommandType = isCommandType;
exports.assertDataPropsMatchMapKeys = assertDataPropsMatchMapKeys;
// Runtime type checks used across commands and events
function isCommand(input) {
    return (input &&
        typeof input.id === 'string' &&
        typeof input.tenant_id === 'string' &&
        typeof input.type === 'string' &&
        'payload' in input);
}
function isEvent(input) {
    return (input &&
        typeof input.id === 'string' &&
        typeof input.aggregateId === 'string' &&
        typeof input.version === 'number' &&
        typeof input.type === 'string');
}
function isCommandType(input, type) {
    return isCommand(input) && input.type === type;
}
function assertDataPropsMatchMapKeys(data, map) {
    const missing = Object.keys(map).filter(k => !(k in data));
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    return true;
}
//# sourceMappingURL=type-guards.js.map