import { Router } from 'express';
import { DomainRegistry } from '../../core/registry';
import initializeCore from '../../core/initialize';
import { attachSchema } from '../../core/shared/zod-schema-conversions';

const router = Router();

// Initialize core
initializeCore();

// Helper function to filter by domain
const filterByDomain = (arr: any[], domain?: string) =>
  domain ? arr.filter(i => i.domain === domain) : arr;

// Main registry endpoint
router.get('/api/registry', (req, res) => {
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
    domains: DomainRegistry.domains(),
    aggregates: Object.keys(DomainRegistry.aggregates()),
    sagas: Object.keys(DomainRegistry.sagas()),
    commandTypes: commands,
    eventTypes: events,
    roles: DomainRegistry.roles(),
  });
});

// Commands endpoint
router.get('/api/registry/commands', (req, res) => {
  const includeSchema = req.query.includeSchema === 'true';
  const domain = req.query.domain as string | undefined;

  const data = filterByDomain(
    Object.values(DomainRegistry.commandTypes()),
    domain,
  );

  res.json(attachSchema(data, includeSchema));
});

// Roles endpoint
router.get('/api/registry/roles', (req, res) => {
  res.json(DomainRegistry.roles());
});


// Events endpoint
router.get('/api/registry/events', (req, res) => {
  const includeSchema = req.query.includeSchema === 'true';
  const domain = req.query.domain as string | undefined;

  const data = filterByDomain(
    Object.values(DomainRegistry.eventTypes()),
    domain,
  );

  res.json(attachSchema(data, includeSchema));
});

// Aggregates endpoint
router.get('/api/registry/aggregates', (_req, res) =>
  res.json(Object.keys(DomainRegistry.aggregates())),
);

// Sagas endpoint
router.get('/api/registry/sagas', (_req, res) =>
  res.json(Object.keys(DomainRegistry.sagas())),
);

// Domains endpoint
router.get('/api/registry/domains', (_req, res) =>
  res.json(DomainRegistry.domains()),
);

// Roles endpoint
router.get('/api/registry/roles', (req, res) => {
  const domain = req.query.domain as string | undefined;

  if (domain) {
    const roles = DomainRegistry.roles()[domain] || [];
    res.json(roles);
  } else {
    res.json(DomainRegistry.roles());
  }
});

export default router;
