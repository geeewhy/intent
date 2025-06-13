"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToJsonSchema = zodToJsonSchema;
exports.schemaToProps = schemaToProps;
exports.attachSchema = attachSchema;
const zod_1 = require("zod");
/**
 * Converts a Zod schema to a JSON Schema representation
 */
function zodToJsonSchema(schema, name) {
    if (!schema)
        return undefined;
    if (schema instanceof zod_1.z.ZodObject) {
        const shape = schema._def.shape();
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = zodTypeToJsonType(value);
            if (!(value instanceof zod_1.z.ZodOptional)) {
                required.push(key);
            }
        }
        return {
            type: 'object',
            title: name,
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }
    return zodTypeToJsonType(schema);
}
/**
 * Helper: Convert Zod type to JSON Schema type
 */
function zodTypeToJsonType(zodType) {
    if (zodType instanceof zod_1.z.ZodString) {
        const checks = zodType._def.checks || [];
        const formatCheck = checks.find((c) => c.kind === 'uuid' || c.kind === 'email');
        return {
            type: 'string',
            ...(formatCheck?.kind === 'uuid' && { format: 'uuid' }),
            ...(formatCheck?.kind === 'email' && { format: 'email' }),
        };
    }
    if (zodType instanceof zod_1.z.ZodNumber) {
        return { type: 'number' };
    }
    if (zodType instanceof zod_1.z.ZodBoolean) {
        return { type: 'boolean' };
    }
    if (zodType instanceof zod_1.z.ZodArray) {
        return {
            type: 'array',
            items: zodTypeToJsonType(zodType._def.type),
        };
    }
    if (zodType instanceof zod_1.z.ZodEnum) {
        return {
            type: 'string',
            enum: zodType._def.values,
        };
    }
    if (zodType instanceof zod_1.z.ZodLiteral) {
        return {
            type: typeof zodType._def.value,
            enum: [zodType._def.value],
        };
    }
    if (zodType instanceof zod_1.z.ZodOptional) {
        return zodTypeToJsonType(zodType._def.innerType);
    }
    if (zodType instanceof zod_1.z.ZodRecord) {
        return {
            type: 'object',
            additionalProperties: zodTypeToJsonType(zodType._def.valueType),
        };
    }
    if (zodType instanceof zod_1.z.ZodAny) {
        return {};
    }
    return {};
}
/**
 * Convert schema to property list for UI rendering
 */
function schemaToProps(schema) {
    if (!schema || !(schema instanceof zod_1.z.ZodObject))
        return [];
    const jsonSchema = zodToJsonSchema(schema);
    const properties = jsonSchema.properties || {};
    const required = jsonSchema.required || [];
    return Object.entries(properties).map(([name, prop]) => ({
        name,
        type: Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type,
        required: required.includes(name),
        description: prop.description,
    }));
}
/**
 * Attach JSON Schema to registry metadata
 */
function attachSchema(items, includeSchema) {
    return items.map(({ payloadSchema, ...rest }) => {
        if (!includeSchema)
            return rest;
        const schema = payloadSchema && typeof payloadSchema === 'object'
            ? zodToJsonSchema(payloadSchema, rest.type)
            : undefined;
        return { ...rest, schema };
    });
}
//# sourceMappingURL=zod-schema-conversions.js.map