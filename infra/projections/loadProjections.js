"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllProjections = loadAllProjections;
const initialize_1 = require("../../core/initialize");
void (0, initialize_1.initializeCore)();
/**
 * Loads all projection handlers from all domains
 * @param pool The database pool to use
 * @returns An array of event handlers
 */
async function loadAllProjections(pool) {
    console.log('Loading all projections...');
    // Import the registry to ensure all domains are registered
    const { getAllProjections } = await Promise.resolve().then(() => __importStar(require('../../core/registry')));
    // Get all projection definitions from the registry
    const defs = Object.values(getAllProjections());
    // Create updaters and materialize projections
    const { createPgUpdaterFor } = await Promise.resolve().then(() => __importStar(require('./pg-updater')));
    // Materialize projections from definitions
    return defs.map(def => {
        const cache = {};
        // Create an updater for each table
        for (const { name } of def.tables) {
            cache[name] = createPgUpdaterFor(name, pool);
        }
        // Create a getUpdater function that returns the appropriate updater for a table
        const getUpdater = (tbl) => {
            const u = cache[tbl];
            if (!u)
                throw new Error(`Table ${tbl} not declared in projection meta`);
            return u;
        };
        // Call the factory with the getUpdater function
        return def.factory(getUpdater);
    });
}
//# sourceMappingURL=loadProjections.js.map