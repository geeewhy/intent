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