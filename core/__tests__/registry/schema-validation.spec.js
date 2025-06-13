"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("../../../core/registry");
const contracts_1 = require("../../../core/system/contracts");
const payload_schemas_1 = require("../../../core/system/payload-schemas");
describe('Schema Validation', () => {
    // Initialize the registry
    beforeAll(() => {
        // Ensure all domains are registered
        require('../../../core/initialize');
    });
    describe('Command Schemas', () => {
        it('should have a schema for every command type', () => {
            // Get all registered command types
            const registeredCommandTypes = Object.keys(registry_1.DomainRegistry.commandTypes());
            // Get all command types from the enum
            const systemCommandTypes = Object.values(contracts_1.SystemCommandType);
            // Check that all system command types are registered
            systemCommandTypes.forEach(cmdType => {
                expect(registeredCommandTypes).toContain(cmdType);
            });
            // Check that all registered command types have a schema
            registeredCommandTypes.forEach(cmdType => {
                const meta = registry_1.DomainRegistry.commandTypes()[cmdType];
                expect(meta.payloadSchema).toBeDefined();
                expect(meta.payloadSchema).not.toBeNull();
            });
            // Check that all command types in the enum have a schema in the map
            systemCommandTypes.forEach(cmdType => {
                expect(payload_schemas_1.commandPayloadSchemas[cmdType]).toBeDefined();
                expect(payload_schemas_1.commandPayloadSchemas[cmdType]).not.toBeNull();
            });
        });
    });
    describe('Event Schemas', () => {
        it('should have a schema for every event type', () => {
            // Get all registered event types
            const registeredEventTypes = Object.keys(registry_1.DomainRegistry.eventTypes());
            // Get all event types from the enum
            const systemEventTypes = Object.values(contracts_1.SystemEventType);
            // Check that all system event types are registered
            systemEventTypes.forEach(evtType => {
                expect(registeredEventTypes).toContain(evtType);
            });
            // Check that all registered event types have a schema
            registeredEventTypes.forEach(evtType => {
                const meta = registry_1.DomainRegistry.eventTypes()[evtType];
                expect(meta.payloadSchema).toBeDefined();
                expect(meta.payloadSchema).not.toBeNull();
            });
            // Check that all event types in the enum have a schema in the map
            systemEventTypes.forEach(evtType => {
                expect(payload_schemas_1.eventPayloadSchemas[evtType]).toBeDefined();
                expect(payload_schemas_1.eventPayloadSchemas[evtType]).not.toBeNull();
            });
        });
    });
});
//# sourceMappingURL=schema-validation.spec.js.map