"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockUpdater = createMockUpdater;
exports.createMockUpdaterFunction = createMockUpdaterFunction;
/**
 * Creates a mock read model updater for testing projections
 * @returns A mock read model updater with a store property for assertions
 */
function createMockUpdater() {
    const store = new Map();
    return {
        async upsert(_, id, data) { store.set(id, data); },
        async remove(_, id) { store.delete(id); },
        store,
    };
}
/**
 * Creates a mock updater function for testing multi-table projections
 * @returns A function that returns a mock updater for each table
 */
function createMockUpdaterFunction() {
    const stores = new Map();
    const getUpdater = (table) => {
        if (!stores.has(table)) {
            stores.set(table, new Map());
        }
        return {
            async upsert(_, id, data) { stores.get(table).set(id, data); },
            async remove(_, id) { stores.get(table).delete(id); },
        };
    };
    // Attach the stores map to the function for assertions
    getUpdater.stores = stores;
    return getUpdater;
}
//# sourceMappingURL=test-utils.js.map