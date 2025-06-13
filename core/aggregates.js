"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRegistry = void 0;
exports.createAggregatePayload = createAggregatePayload;
exports.getAggregateClass = getAggregateClass;
exports.supportsAggregateType = supportsAggregateType;
// src/core/aggregates.ts
/**
 * Registry of all aggregate types and their corresponding classes
 */
const system_aggregate_1 = require("./system/aggregates/system.aggregate");
/**
 * Create a command payload for a new aggregate instance
 * @param aggregateType The type of the aggregate
 * @param aggregateId The ID of the aggregate
 * @returns A command payload suitable for creating a new aggregate instance
 */
function createAggregatePayload(aggregateType, aggregateId) {
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
exports.AggregateRegistry = {
    system: system_aggregate_1.SystemAggregate,
};
/**
 * Get the aggregate class for a given aggregate type
 * @param aggregateType The type of the aggregate
 * @returns The aggregate class or undefined if not found
 */
function getAggregateClass(aggregateType) {
    return exports.AggregateRegistry[aggregateType];
}
/**
 * Check if an aggregate type is supported
 * @param aggregateType The type of the aggregate
 * @returns True if the aggregate type is supported, false otherwise
 */
function supportsAggregateType(aggregateType) {
    return !!exports.AggregateRegistry[aggregateType];
}
//# sourceMappingURL=aggregates.js.map