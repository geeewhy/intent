import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { commandRegistry } from '@/data';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);                       // uuid, email, date-time …

export const validators: Record<string, ReturnType<Ajv['compile']>> =
  Object.fromEntries(
    commandRegistry.map(c => [c.type, ajv.compile(c.schema)])
  );

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