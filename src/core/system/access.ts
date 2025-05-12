import { registerCondition } from '../policy-registry';

export enum SystemAccessCondition {
  CAN_TRIGGER_FAILURE = 'system.canTriggerFailure',
  CAN_EMIT_EVENTS = 'system.canEmitEvents',
}

export interface SystemAccessContext {
  role: 'system' | 'tester' | 'developer';
}

registerCondition(SystemAccessCondition.CAN_TRIGGER_FAILURE, ({ role }: SystemAccessContext) =>
  role === 'system'
);

registerCondition(SystemAccessCondition.CAN_EMIT_EVENTS, ({ role }: SystemAccessContext) =>
  role === 'tester' || role === 'system' || role === 'developer'
);

export const systemAccessModel = {
  actors: {
    tester: ['logMessage', 'emitMultipleEvents', 'executeTest'],
    system: ['simulateFailure', 'executeRetryableTest'],
    developer: ['logMessage', 'emitMultipleEvents', 'executeTest', 'executeRetryableTest'],
  },
};