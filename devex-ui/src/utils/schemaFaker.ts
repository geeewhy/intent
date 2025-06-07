import jsf from 'json-schema-faker';
import { faker } from '@faker-js/faker';

jsf.extend('faker', () => faker);
jsf.option({ alwaysFakeOptionals: true });

function tweakSchema(schema: any) {
  const clone = structuredClone(schema);

  if (!clone.properties) return clone;

  Object.entries(clone.properties).forEach(([key, prop]: [string, any]) => {
    if (/id$/i.test(key) && prop.type === 'string') {
      prop.format = 'uuid';
    }

    if (prop.type === 'number') {
      prop.minimum    = 1;
      prop.maximum    = 5;
      prop.multipleOf = 1;
    }
  });

  return clone;
}

export function makeExample(schema: object) {
  const patched = tweakSchema(schema);
  return jsf.generate(patched);
}
