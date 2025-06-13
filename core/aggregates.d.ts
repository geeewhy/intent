export interface AggregateClass {
    new (id: string): any;
    create: (cmd: any) => any;
    rehydrate: (events: any[]) => any;
}
/**
 * Create a command payload for a new aggregate instance
 * @param aggregateType The type of the aggregate
 * @param aggregateId The ID of the aggregate
 * @returns A command payload suitable for creating a new aggregate instance
 */
export declare function createAggregatePayload(aggregateType: string, aggregateId: string): any;
export declare const AggregateRegistry: Record<string, AggregateClass>;
/**
 * Get the aggregate class for a given aggregate type
 * @param aggregateType The type of the aggregate
 * @returns The aggregate class or undefined if not found
 */
export declare function getAggregateClass(aggregateType: string): AggregateClass | undefined;
/**
 * Check if an aggregate type is supported
 * @param aggregateType The type of the aggregate
 * @returns True if the aggregate type is supported, false otherwise
 */
export declare function supportsAggregateType(aggregateType: string): boolean;
