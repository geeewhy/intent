// core/shared/test-utils.ts
// Helper utilities for unit tests across domains
import { ReadModelUpdaterPort } from '../contracts';

/**
 * Creates a mock read model updater for testing projections
 * @returns A mock read model updater with a store property for assertions
 */
export function createMockUpdater(): ReadModelUpdaterPort<any> & { store: Map<string, any> } {
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
export function createMockUpdaterFunction(): ((table: string) => ReadModelUpdaterPort<any>) & { stores: Map<string, Map<string, any>> } {
  const stores = new Map<string, Map<string, any>>();

  const getUpdater = (table: string): ReadModelUpdaterPort<any> => {
    if (!stores.has(table)) {
      stores.set(table, new Map<string, any>());
    }

    return {
      async upsert(_, id, data) { stores.get(table)!.set(id, data); },
      async remove(_, id) { stores.get(table)!.delete(id); },
    };
  };

  // Attach the stores map to the function for assertions
  (getUpdater as any).stores = stores;

  return getUpdater as ((table: string) => ReadModelUpdaterPort<any>) & { stores: Map<string, Map<string, any>> };
}
