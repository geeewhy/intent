import { z, ZodTypeAny } from 'zod';

/**
 * Converts a Zod schema to a JSON Schema representation
 */
export function zodToJsonSchema(schema: z.ZodTypeAny, name?: string): any {
  if (!schema) return undefined;

  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonType(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional)) {
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
function zodTypeToJsonType(zodType: z.ZodTypeAny): any {
  if (zodType instanceof z.ZodString) {
    const checks = zodType._def.checks || [];
    const formatCheck = checks.find((c: any) => c.kind === 'uuid' || c.kind === 'email');

    return {
      type: 'string',
      ...(formatCheck?.kind === 'uuid' && { format: 'uuid' }),
      ...(formatCheck?.kind === 'email' && { format: 'email' }),
    };
  }

  if (zodType instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (zodType instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodTypeToJsonType(zodType._def.type),
    };
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: zodType._def.values,
    };
  }

  if (zodType instanceof z.ZodLiteral) {
    return {
      type: typeof zodType._def.value,
      enum: [zodType._def.value],
    };
  }

  if (zodType instanceof z.ZodOptional) {
    return zodTypeToJsonType(zodType._def.innerType);
  }

  if (zodType instanceof z.ZodRecord) {
    return {
      type: 'object',
      additionalProperties: zodTypeToJsonType(zodType._def.valueType),
    };
  }

  if (zodType instanceof z.ZodAny) {
    return {};
  }

  return {};
}

/**
 * Convert schema to property list for UI rendering
 */
export function schemaToProps(schema: z.ZodTypeAny): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
}> {
  if (!schema || !(schema instanceof z.ZodObject)) return [];

  const jsonSchema = zodToJsonSchema(schema);
  const properties = jsonSchema.properties || {};
  const required = jsonSchema.required || [];

  return Object.entries(properties).map(([name, prop]: [string, any]) => ({
    name,
    type: Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type,
    required: required.includes(name),
    description: prop.description,
  }));
}

/**
 * Attach JSON Schema to registry metadata
 */
export function attachSchema<
    T extends { type: string; payloadSchema?: ZodTypeAny }
>(items: T[], includeSchema: boolean): unknown[] {
  return items.map(({ payloadSchema, ...rest }) => {
    if (!includeSchema) return rest;

    const schema =
        payloadSchema && typeof payloadSchema === 'object'
            ? zodToJsonSchema(payloadSchema, rest.type)
            : undefined;

    return { ...rest, schema };
  });
}
