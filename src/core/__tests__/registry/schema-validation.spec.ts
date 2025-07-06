import { DomainRegistry } from '../../../core/registry';
import { SystemCommandType, SystemEventType } from '../../example-slices/system/contracts';
import { commandPayloadSchemas, eventPayloadSchemas } from '../../example-slices/system/payload-schemas';

describe('Schema Validation', () => {
  // Initialize the registry
  beforeAll(() => {
    // Ensure all domains are registered
    require('../../../core/initialize');
  });

  describe('Command Schemas', () => {
    it('should have a schema for every command type', () => {
      // Get all registered command types
      const registeredCommandTypes = Object.keys(DomainRegistry.commandTypes());
      
      // Get all command types from the enum
      const systemCommandTypes = Object.values(SystemCommandType);
      
      // Check that all system command types are registered
      systemCommandTypes.forEach(cmdType => {
        expect(registeredCommandTypes).toContain(cmdType);
      });
      
      // Check that all registered command types have a schema
      registeredCommandTypes.forEach(cmdType => {
        const meta = DomainRegistry.commandTypes()[cmdType];
        expect(meta.payloadSchema).toBeDefined();
        expect(meta.payloadSchema).not.toBeNull();
      });
      
      // Check that all command types in the enum have a schema in the map
      systemCommandTypes.forEach(cmdType => {
        expect(commandPayloadSchemas[cmdType]).toBeDefined();
        expect(commandPayloadSchemas[cmdType]).not.toBeNull();
      });
    });
  });

  describe('Event Schemas', () => {
    it('should have a schema for every event type', () => {
      // Get all registered event types
      const registeredEventTypes = Object.keys(DomainRegistry.eventTypes());
      
      // Get all event types from the enum
      const systemEventTypes = Object.values(SystemEventType);
      
      // Check that all system event types are registered
      systemEventTypes.forEach(evtType => {
        expect(registeredEventTypes).toContain(evtType);
      });
      
      // Check that all registered event types have a schema
      registeredEventTypes.forEach(evtType => {
        const meta = DomainRegistry.eventTypes()[evtType];
        expect(meta.payloadSchema).toBeDefined();
        expect(meta.payloadSchema).not.toBeNull();
      });
      
      // Check that all event types in the enum have a schema in the map
      systemEventTypes.forEach(evtType => {
        expect(eventPayloadSchemas[evtType]).toBeDefined();
        expect(eventPayloadSchemas[evtType]).not.toBeNull();
      });
    });
  });
});