
import jsf from 'json-schema-faker';
import { faker } from '@faker-js/faker';

jsf.extend('faker', () => faker);
jsf.option({
  alwaysFakeOptionals: true,
  // Ensure boolean values are properly maintained
  useExamplesValue: true,
  useDefaultValue: true,
  // Set this to ensure the default value is used when possible
  defaultRandExpMax: 5
});

// Add a custom format for boolean to ensure proper handling
jsf.format('boolean', () => {
  // Generate a balanced mix of true and false values
  // Using explicit boolean to avoid conversion issues
  return Boolean(Math.round(Math.random()));
});

function tweakSchema(schema: Record<string, unknown>) {
  console.log('cmd schema', schema);
  const clone = structuredClone(schema);

  if (!clone.properties) return clone;

  Object.entries(clone.properties).forEach(([key, prop]: [string, Record<string, unknown>]) => {
    // Only add UUID format if it's not already explicitly defined
    if (/id$/i.test(key) && prop.type === 'string' && !prop.format) {
      prop.format = 'uuid';
    }

    if (prop.type === 'number') {
      prop.minimum    = 1;
      prop.maximum    = 10;
      prop.multipleOf = 1;
    }

    // Fix empty objects that should be booleans (like isStaple)
    if (Object.keys(prop).length === 0 && /is[A-Z]/i.test(key)) {
      console.log(`Fixing empty object for boolean field: ${key}`);
      prop.type = 'boolean';
      prop.format = 'boolean';

      // Add examples to help with consistent generation
      prop.examples = [true, false];
    }

    // Boolean fields handling - explicit examples to ensure proper values
    if (prop.type === 'boolean') {
      // Set a specific example to ensure proper serialization
      prop.examples = [true, false];

      // Use our custom format to ensure proper boolean handling
      prop.format = 'boolean';

      // Set a default value - this can help with proper value type retention
      if (key.startsWith('is') && !('default' in prop)) {
        // Fields starting with 'is' often default to false
        prop.default = false;
      }
    }

    // Handle Date objects - respect explicit format
    if (prop.type === 'string') {
      if (prop.format === 'date') {
        // For date only
        prop.faker = 'date.recent';
      } else if (prop.format === 'date-time') {
        // For date-time
        prop.faker = 'date.recent';
      } else if (/date/i.test(key) && !prop.format) {
        // Only infer format from name if not explicitly set
        prop.format = 'date-time';
        prop.faker = 'date.recent';
        console.log(`Inferred date-time format for ${key}`);
      }
    }

    console.log(key, prop.type, prop.format);
  });

  return clone;
}

export function makeExample(schema: object) {
  console.log('cmdschema', schema);
  const patched = tweakSchema(schema);

  // Post-processing to ensure boolean values are preserved correctly
  const result = jsf.generate(patched);

  // For debugging - log the generated result
  console.log('Generated example:', JSON.stringify(result));

  return result;
}