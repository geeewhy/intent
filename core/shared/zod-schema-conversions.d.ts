import { z, ZodTypeAny } from 'zod';
/**
 * Converts a Zod schema to a JSON Schema representation
 */
export declare function zodToJsonSchema(schema: z.ZodTypeAny, name?: string): any;
/**
 * Convert schema to property list for UI rendering
 */
export declare function schemaToProps(schema: z.ZodTypeAny): Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
}>;
/**
 * Attach JSON Schema to registry metadata
 */
export declare function attachSchema<T extends {
    type: string;
    payloadSchema?: ZodTypeAny;
}>(items: T[], includeSchema: boolean): unknown[];
