import { DomainRegistry } from './registry';

// Import all domain registrations to ensure they're loaded
// These imports trigger the self-registration
import './system/register';
// Additional domains will be imported here as they are implemented

/**
 * Initialize the core system
 * This function should be called at application startup
 * @returns A promise that resolves when initialization is complete
 */
export async function initializeCore() {
  console.log('Core initialized with:');
  console.log(`- ${Object.keys(DomainRegistry.domains()).length} domains`);
  console.log(`- ${Object.keys(DomainRegistry.aggregates()).length} aggregates`);
  console.log(`- ${Object.keys(DomainRegistry.commandHandlers()).length} command handlers`);
  console.log(`- ${Object.keys(DomainRegistry.sagas()).length} sagas`);
  console.log(`- ${Object.keys(DomainRegistry.commandTypes()).length} command types`);
  console.log(`- ${Object.keys(DomainRegistry.eventTypes()).length} event types`);
}

export default initializeCore;