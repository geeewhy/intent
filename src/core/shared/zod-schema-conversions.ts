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
  // First handle preprocessed fields by checking _def structure
  if (zodType._def && zodType._def.effect?.type === 'preprocess') {
    // For preprocessed boolean fields
    if (zodType._def.schema instanceof z.ZodBoolean) {
      return {
        type: 'boolean',
        format: 'boolean'
      };
    }
    // For preprocessed date fields
    else if (zodType._def.schema instanceof z.ZodDate) {
      return {
        type: 'string',
        format: 'date'
      };
    }
    // For other preprocessed types, pass through to the inner schema
    else if (zodType._def.schema) {
      return zodTypeToJsonType(zodType._def.schema);
    }
  }

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
    return {
      type: 'boolean',
      format: 'boolean'  // Add explicit boolean format
    };
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

  if (zodType instanceof z.ZodDate) {
    return {
      type: 'string',
      format: 'date'  // Add explicit date format
    };
  }

  if (zodType instanceof z.ZodDefault) {
    // For fields with default values, extract the inner type
    return zodTypeToJsonType(zodType._def.innerType);
  }

  if (zodType instanceof z.ZodAny) {
    return {};
  }

  // Fallback for unhandled types - check for common type indicators in _def
  if (zodType._def) {
    // Try to infer boolean type from structure
    if (zodType._def.typeName === 'ZodBoolean' ||
        (zodType._def.schema && zodType._def.schema._def?.typeName === 'ZodBoolean')) {
      return {
        type: 'boolean',
        format: 'boolean'
      };
    }
  }

  // Final fallback
  console.warn('Unhandled Zod type:', zodType);
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