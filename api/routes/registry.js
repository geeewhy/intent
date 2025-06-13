"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const registry_1 = require("../../core/registry");
const initialize_1 = __importDefault(require("../../core/initialize"));
const zod_schema_conversions_1 = require("../../core/shared/zod-schema-conversions");
const router = (0, express_1.Router)();
// Initialize core
(0, initialize_1.default)();
// Helper function to filter by domain
const filterByDomain = (arr, domain) => domain ? arr.filter(i => i.domain === domain) : arr;
// Main registry endpoint
router.get('/api/registry', (req, res) => {
    const includeSchema = req.query.includeSchema === 'true';
    const commands = (0, zod_schema_conversions_1.attachSchema)(Object.values(registry_1.DomainRegistry.commandTypes()), includeSchema);
    const events = (0, zod_schema_conversions_1.attachSchema)(Object.values(registry_1.DomainRegistry.eventTypes()), includeSchema);
    res.json({
        domains: registry_1.DomainRegistry.domains(),
        aggregates: Object.keys(registry_1.DomainRegistry.aggregates()),
        sagas: Object.keys(registry_1.DomainRegistry.sagas()),
        commandTypes: commands,
        eventTypes: events,
        roles: registry_1.DomainRegistry.roles(),
    });
});
// Commands endpoint
router.get('/api/registry/commands', (req, res) => {
    const includeSchema = req.query.includeSchema === 'true';
    const domain = req.query.domain;
    const data = filterByDomain(Object.values(registry_1.DomainRegistry.commandTypes()), domain);
    res.json((0, zod_schema_conversions_1.attachSchema)(data, includeSchema));
});
// Roles endpoint
router.get('/api/registry/roles', (req, res) => {
    res.json(registry_1.DomainRegistry.roles());
});
// Events endpoint
router.get('/api/registry/events', (req, res) => {
    const includeSchema = req.query.includeSchema === 'true';
    const domain = req.query.domain;
    const data = filterByDomain(Object.values(registry_1.DomainRegistry.eventTypes()), domain);
    res.json((0, zod_schema_conversions_1.attachSchema)(data, includeSchema));
});
// Aggregates endpoint
router.get('/api/registry/aggregates', (_req, res) => res.json(Object.keys(registry_1.DomainRegistry.aggregates())));
// Sagas endpoint
router.get('/api/registry/sagas', (_req, res) => res.json(Object.keys(registry_1.DomainRegistry.sagas())));
// Domains endpoint
router.get('/api/registry/domains', (_req, res) => res.json(registry_1.DomainRegistry.domains()));
// Roles endpoint
router.get('/api/registry/roles', (req, res) => {
    const domain = req.query.domain;
    if (domain) {
        const roles = registry_1.DomainRegistry.roles()[domain] || [];
        res.json(roles);
    }
    else {
        res.json(registry_1.DomainRegistry.roles());
    }
});
exports.default = router;
//# sourceMappingURL=registry.js.map