// src/core/aggregates.ts
/**
 * Registry of all aggregate types and their corresponding classes
 */

import { OrderAggregate } from './order/aggregates/order.aggregate';

// Interface for aggregate classes with static methods
export interface AggregateClass {
  create: (cmd: any) => any;
  rehydrate: (events: any[]) => any;
}

/**
 * Create a command payload for a new aggregate instance
 * @param aggregateType The type of the aggregate
 * @param aggregateId The ID of the aggregate
 * @returns A command payload suitable for creating a new aggregate instance
 */
export function createAggregatePayload(aggregateType: string, aggregateId: string): any {
  // Different aggregate types might have different payload structures
  // For now, we'll use a generic approach that works with OrderAggregate
  return {
    payload: {
      [`${aggregateType}Id`]: aggregateId,
      aggregateId: aggregateId,
      aggregateType: aggregateType
    }
  };
}

// Registry of aggregate types to their corresponding classes
export const AggregateRegistry: Record<string, AggregateClass> = {
  order: OrderAggregate,
};

/**
 * Get the aggregate class for a given aggregate type
 * @param aggregateType The type of the aggregate
 * @returns The aggregate class or undefined if not found
 */
export function getAggregateClass(aggregateType: string): AggregateClass | undefined {
  return AggregateRegistry[aggregateType];
}

/**
 * Check if an aggregate type is supported
 * @param aggregateType The type of the aggregate
 * @returns True if the aggregate type is supported, false otherwise
 */
export function supportsAggregateType(aggregateType: string): boolean {
  return !!AggregateRegistry[aggregateType];
}
