"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectionMeta = void 0;
exports.register = register;
exports.registerSystemProjections = registerSystemProjections;
const pg_updater_1 = require("../../../infra/projections/pg-updater");
const system_status_projection_1 = require("./system-status.projection");
Object.defineProperty(exports, "projectionMeta", { enumerable: true, get: function () { return system_status_projection_1.projectionMeta; } });
const registry_1 = require("../../registry");
/**
 * Registers all projection definitions for the system slice
 */
function register() {
    // Register the projection definition in the central registry
    (0, registry_1.registerProjection)('systemStatus', {
        tables: [...system_status_projection_1.projectionMeta.tables],
        eventTypes: [...system_status_projection_1.projectionMeta.eventTypes],
        factory: system_status_projection_1.createSystemStatusProjection
    });
}
/**
 * Creates projection handlers for the system slice
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
function registerSystemProjections(pool) {
    // Create a cache of updaters for each table
    const updaterCache = {};
    // Create an updater for each table that has migration files
    const tablesWithMigrations = ['system_status', 'system_metrics'];
    for (const { name } of system_status_projection_1.projectionMeta.tables) {
        if (tablesWithMigrations.includes(name)) {
            updaterCache[name] = (0, pg_updater_1.createPgUpdaterFor)(name, pool);
        }
    }
    // Create a getUpdater function
    const getUpdater = (tableName) => {
        const updater = updaterCache[tableName];
        if (!updater) {
            console.warn(`No updater found for table ${tableName}, using no-op updater`);
            // Return a no-op updater for tables that don't have migration files
            return {
                async upsert() { },
                async remove() { }
            };
        }
        return updater;
    };
    // Create the projection handler
    const projection = (0, system_status_projection_1.createSystemStatusProjection)(getUpdater);
    return [projection];
}
//# sourceMappingURL=register.js.map