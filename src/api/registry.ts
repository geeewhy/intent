import { DomainRegistry } from '../core/registry';
import { initializeCore } from '../core/initialize';

/**
 * Register routes for accessing the registry information
 * @param app The Express app or similar router
 */
export function registerRegistryRoutes(app: any) {
  // Initialize the registry
  initializeCore();
  
  // API endpoint to get all registry information
  app.get('/api/registry', (req: any, res: any) => {
    res.json({
      domains: DomainRegistry.domains(),
      aggregates: Object.keys(DomainRegistry.aggregates()),
      sagas: Object.keys(DomainRegistry.sagas()),
      commandTypes: DomainRegistry.commandTypes(),
      eventTypes: DomainRegistry.eventTypes(),
    });
  });
  
  // API endpoint to get command types
  app.get('/api/registry/commands', (req: any, res: any) => {
    const domain = req.query.domain;
    if (domain) {
      const commands = Object.values(DomainRegistry.commandTypes())
        .filter(cmd => cmd.domain === domain);
      res.json(commands);
    } else {
      res.json(DomainRegistry.commandTypes());
    }
  });
  
  // API endpoint to get event types
  app.get('/api/registry/events', (req: any, res: any) => {
    const domain = req.query.domain;
    if (domain) {
      const events = Object.values(DomainRegistry.eventTypes())
        .filter(evt => evt.domain === domain);
      res.json(events);
    } else {
      res.json(DomainRegistry.eventTypes());
    }
  });

  // API endpoint to get aggregates
  app.get('/api/registry/aggregates', (req: any, res: any) => {
    res.json(Object.keys(DomainRegistry.aggregates()));
  });

  // API endpoint to get sagas
  app.get('/api/registry/sagas', (req: any, res: any) => {
    res.json(Object.keys(DomainRegistry.sagas()));
  });

  // API endpoint to get domains
  app.get('/api/registry/domains', (req: any, res: any) => {
    res.json(DomainRegistry.domains());
  });
}

export default registerRegistryRoutes;