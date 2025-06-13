"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainRegistry = void 0;
exports.registerDomain = registerDomain;
exports.registerAggregate = registerAggregate;
exports.registerCommandHandler = registerCommandHandler;
exports.registerEventHandler = registerEventHandler;
exports.registerSaga = registerSaga;
exports.registerCommandType = registerCommandType;
exports.registerEventType = registerEventType;
exports.registerProjection = registerProjection;
exports.registerRoles = registerRoles;
exports.getAllAggregates = getAllAggregates;
exports.getAllCommandHandlers = getAllCommandHandlers;
exports.getAllEventHandlers = getAllEventHandlers;
exports.getAllSagas = getAllSagas;
exports.getAllCommandTypes = getAllCommandTypes;
exports.getAllEventTypes = getAllEventTypes;
exports.getAllProjections = getAllProjections;
exports.getAllDomains = getAllDomains;
exports.getAllRoles = getAllRoles;
const registry = {
    aggregates: {},
    commandHandlers: {},
    eventHandlers: {},
    sagas: {},
    commandTypes: {},
    eventTypes: {},
    projections: {},
    domains: [],
    roles: {},
};
// --- Registration helpers
function registerDomain(name) {
    if (!registry.domains.includes(name))
        registry.domains.push(name);
}
function registerAggregate(type, cls) {
    if (registry.aggregates[type])
        throw new Error(`Aggregate ${type} already registered`);
    registry.aggregates[type] = cls;
}
function registerCommandHandler(name, h) {
    if (registry.commandHandlers[name])
        throw new Error(`Command handler ${name} already registered`);
    registry.commandHandlers[name] = h;
}
function registerEventHandler(name, h) {
    if (registry.eventHandlers[name])
        throw new Error(`Event handler ${name} already registered`);
    registry.eventHandlers[name] = h;
}
function registerSaga(name, saga) {
    if (registry.sagas[name])
        throw new Error(`Saga ${name} already registered`);
    registry.sagas[name] = saga;
}
function registerCommandType(t, meta) {
    if (registry.commandTypes[t])
        throw new Error(`Command type ${t} already registered`);
    registry.commandTypes[t] = { type: t, ...meta };
}
function registerEventType(t, meta) {
    if (registry.eventTypes[t])
        throw new Error(`Event type ${t} already registered`);
    registry.eventTypes[t] = { type: t, ...meta };
}
function registerProjection(name, def) {
    if (registry.projections[name])
        throw new Error(`Projection ${name} already registered`);
    registry.projections[name] = def;
}
function registerRoles(domain, roles) {
    if (registry.roles[domain])
        throw new Error(`Roles already registered for domain: ${domain}`);
    registry.roles[domain] = roles;
}
/* ——— Getters ——— */
function getAllAggregates() {
    return registry.aggregates;
}
function getAllCommandHandlers() {
    return registry.commandHandlers;
}
function getAllEventHandlers() {
    return registry.eventHandlers;
}
function getAllSagas() {
    return registry.sagas;
}
function getAllCommandTypes() {
    return registry.commandTypes;
}
function getAllEventTypes() {
    return registry.eventTypes;
}
function getAllProjections() {
    return registry.projections;
}
function getAllDomains() {
    return registry.domains;
}
function getAllRoles() {
    return registry.roles;
}
// -- convenience exports
exports.DomainRegistry = {
    aggregates: getAllAggregates,
    commandHandlers: getAllCommandHandlers,
    eventHandlers: getAllEventHandlers,
    sagas: getAllSagas,
    commandTypes: getAllCommandTypes,
    eventTypes: getAllEventTypes,
    projections: getAllProjections,
    domains: getAllDomains,
    roles: getAllRoles,
};
exports.default = exports.DomainRegistry;
//# sourceMappingURL=registry.js.map