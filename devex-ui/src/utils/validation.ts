//devex-ui/src/utils/validation.ts
/**
 * Validation utilities for command payloads
 */

import { CommandSchema } from '@/data';

/**
 * Validate a command payload against its schema
 * @param commandType The type of command
 * @param payload The payload to validate
 * @param commandRegistry The command registry containing schemas
 * @returns An object with isValid and errors properties
 */
export function validateCommandPayload(
  commandType: string,
  payload: Record<string, unknown>,
  commandRegistry: CommandSchema[]
): { isValid: boolean; errors: string[] } {
  // Find the command schema
  const commandSchema = commandRegistry.find(cmd => cmd.type === commandType);
  if (!commandSchema) {
    return { isValid: false, errors: [`Unknown command type: ${commandType}`] };
  }

  const errors: string[] = [];
  const schema = commandSchema.schema;

  // Check required fields
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (payload[requiredField] === undefined || payload[requiredField] === null || payload[requiredField] === '') {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
  }

  // Check field types
  for (const [key, value] of Object.entries(payload)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      errors.push(`Unknown field: ${key}`);
      continue;
    }

    // Type validation
    if (propSchema.type === 'string' && typeof value !== 'string') {
      errors.push(`Field ${key} must be a string`);
    } else if (propSchema.type === 'number' && typeof value !== 'number') {
      errors.push(`Field ${key} must be a number`);
    } else if (propSchema.type === 'object' && (typeof value !== 'object' || value === null)) {
      errors.push(`Field ${key} must be an object`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
