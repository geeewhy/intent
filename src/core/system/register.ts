//src/core/system/register.ts
import {
  registerDomain, 
  registerAggregate, 
  registerCommandHandler, 
  registerSaga,
  registerCommandType,
  registerEventType,
} from '../registry';
import { SystemAggregate } from './aggregates/system.aggregate';
import { SystemCommandHandler } from './command-handler';
import { systemSagaRegistry } from './sagas/saga-registry';
import { SystemCommandType, SystemEventType } from './contracts';
import { register as registerSystemProjections } from './read-models/register';

/**
 * Self-registration function for the system domain
 * Registers all system domain components with the central registry
 */
export function registerSystemDomain(): void {
  // Register the domain itself
  registerDomain('system');

  // Register aggregates
  registerAggregate('system', SystemAggregate);

  // Register command handlers
  registerCommandHandler('system', new SystemCommandHandler());

  // Register projections
  registerSystemProjections();

  // Register sagas
  Object.entries(systemSagaRegistry).forEach(([name, saga]) => {
    registerSaga(name, saga);
  });

  // Register command types
  Object.values(SystemCommandType).forEach(type => {
    registerCommandType(type, {
      domain: 'system',
      description: `System command: ${type}`
    });
  });

  // Register event types
  Object.values(SystemEventType).forEach(type => {
    registerEventType(type, {
      domain: 'system',
      description: `System event: ${type}`
    });
  });
}

// Auto-register when imported
registerSystemDomain();
