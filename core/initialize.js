"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCore = initializeCore;
const registry_1 = require("./registry");
// Import all domain registrations to ensure they're loaded
// These imports trigger the self-registration
require("./system/register");
// Additional domains will be imported here as they are implemented
/**
 * Initialize the core system
 * This function should be called at application startup
 * @returns A promise that resolves when initialization is complete
 */
async function initializeCore() {
    console.log('Core initialized');
    console.log(`- ${Object.keys(registry_1.DomainRegistry.domains()).length} domains`);
    console.log(`- ${Object.keys(registry_1.DomainRegistry.aggregates()).length} aggregates`);
    console.log(`- ${Object.keys(registry_1.DomainRegistry.commandHandlers()).length} command handlers`);
    console.log(`- ${Object.keys(registry_1.DomainRegistry.sagas()).length} sagas`);
    console.log(`- ${Object.keys(registry_1.DomainRegistry.commandTypes()).length} command types`);
    console.log(`- ${Object.keys(registry_1.DomainRegistry.eventTypes()).length} event types`);
}
exports.default = initializeCore;
//# sourceMappingURL=initialize.js.map