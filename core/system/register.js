"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemDomain = registerSystemDomain;
//src/core/system/register.ts
const registry_1 = require("../registry");
const system_aggregate_1 = require("./aggregates/system.aggregate");
const command_handler_1 = require("./command-handler");
const saga_registry_1 = require("./sagas/saga-registry");
const contracts_1 = require("./contracts");
const register_1 = require("./read-models/register");
const payload_schemas_1 = require("./payload-schemas");
const aggregateRouting = {
    aggregateType: 'system',
    extractId: (payload) => payload.systemId || 'system'
};
/**
 * Self-registration function for the system domain
 * Registers all system domain components with the central registry
 */
function registerSystemDomain() {
    // Register the domain itself
    (0, registry_1.registerDomain)('system');
    // Register aggregates
    (0, registry_1.registerAggregate)('system', system_aggregate_1.SystemAggregate);
    // Register command handlers
    (0, registry_1.registerCommandHandler)('system', new command_handler_1.SystemCommandHandler());
    // Register projections
    (0, register_1.register)();
    // Register sagas
    Object.entries(saga_registry_1.systemSagaRegistry).forEach(([name, saga]) => {
        (0, registry_1.registerSaga)(name, saga);
    });
    // Register command types
    Object.values(contracts_1.SystemCommandType).forEach(type => {
        (0, registry_1.registerCommandType)(type, {
            domain: 'system',
            description: `System command: ${type}`,
            payloadSchema: payload_schemas_1.commandPayloadSchemas[type],
            aggregateRouting: aggregateRouting
        });
    });
    // Register event types
    Object.values(contracts_1.SystemEventType).forEach(type => {
        (0, registry_1.registerEventType)(type, {
            domain: 'system',
            description: `System event: ${type}`,
            payloadSchema: payload_schemas_1.eventPayloadSchemas[type]
        });
    });
    // Register roles
    (0, registry_1.registerRoles)('system', ['tester', 'system', 'developer']);
}
// Auto-register when imported
registerSystemDomain();
//# sourceMappingURL=register.js.map