import { DomainRegistry } from '../core/registry';
import initializeCore  from '../core/initialize';
import { attachSchema } from '../core/shared/zod-schema-conversions';

export function registerRegistryRoutes(app: any) {
  initializeCore();

  // -- init
  const filterByDomain = (arr: any[], domain?: string) =>
      domain ? arr.filter(i => i.domain === domain) : arr;

  // -- registry routes
  app.get('/api/registry', (req: any, res: any) => {
    const includeSchema = req.query.includeSchema === 'true';

    const commands = attachSchema(
        Object.values(DomainRegistry.commandTypes()),
        includeSchema,
    );

    const events = attachSchema(
        Object.values(DomainRegistry.eventTypes()),
        includeSchema,
    );

    res.json({
      domains:     DomainRegistry.domains(),
      aggregates:  Object.keys(DomainRegistry.aggregates()),
      sagas:       Object.keys(DomainRegistry.sagas()),
      commandTypes: commands,
      eventTypes:   events,
    });
  });

  // -- passthrough for registry metadata
  app.get('/api/registry/commands', (req: any, res: any) => {
    const includeSchema = req.query.includeSchema === 'true';
    const domain        = req.query.domain as string | undefined;

    const data = filterByDomain(
        Object.values(DomainRegistry.commandTypes()),
        domain,
    );

    res.json(attachSchema(data, includeSchema));
  });

  app.get('/api/registry/events', (req: any, res: any) => {
    const includeSchema = req.query.includeSchema === 'true';
    const domain        = req.query.domain as string | undefined;

    const data = filterByDomain(
        Object.values(DomainRegistry.eventTypes()),
        domain,
    );

    res.json(attachSchema(data, includeSchema));
  });

  app.get('/api/registry/aggregates', (_req: any, res: any) =>
      res.json(Object.keys(DomainRegistry.aggregates())),
  );
  app.get('/api/registry/sagas', (_req: any, res: any) =>
      res.json(Object.keys(DomainRegistry.sagas())),
  );
  app.get('/api/registry/domains', (_req: any, res: any) =>
      res.json(DomainRegistry.domains()),
  );
}

export default registerRegistryRoutes;
