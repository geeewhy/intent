//devex-ui/src/utils/schemaValidator.ts
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { CommandSchema } from '@/data/types';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);                       // uuid, email, date-time …

export const validators: Record<string, ReturnType<Ajv['compile']>> = {};

export function registerSchemas(registry: CommandSchema[]) {
  registry.forEach((cmd) => {
    validators[cmd.type] = ajv.compile(cmd.schema);
  });
}

export function validate(type: string, data: unknown) {
  const v = validators[type];
  if (!v) return { ok: false, errors: [`Unknown command ${type}`] };
  const ok = v(data);
  const errs = (v.errors ?? []) as ErrorObject[];
  return {
    ok,
    errors: errs.map(e => `${e.instancePath || '(root)'} ${e.message}`)
  };
}
