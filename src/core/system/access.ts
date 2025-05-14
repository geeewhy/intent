//src/core/system/access.ts
import {registerCondition} from '../policy-registry';

export enum SystemAccessCondition {
    CAN_TRIGGER_FAILURE = 'system.canTriggerFailure',
    CAN_EMIT_EVENTS = 'system.canEmitEvents',
    CAN_EXECUTE_TEST = 'system.canExecuteTest',
}

export interface SystemAccessContext {
    role: 'system' | 'tester' | 'developer';
}

registerCondition(SystemAccessCondition.CAN_TRIGGER_FAILURE, ({role}: SystemAccessContext) =>
    role === 'system'
);

registerCondition(SystemAccessCondition.CAN_EMIT_EVENTS, ({role}: SystemAccessContext) =>
    role === 'tester' || role === 'system' || role === 'developer'
);

registerCondition(SystemAccessCondition.CAN_EXECUTE_TEST, ({role}: SystemAccessContext) =>
    role === 'tester' || role === 'system' || role === 'developer'
);

export const systemAccessModel = {
    actors: {
        tester: ['logMessage', 'emitMultipleEvents', 'executeTest'],
        system: ['simulateFailure', 'executeRetryableTest'],
        developer: ['logMessage', 'emitMultipleEvents', 'executeTest', 'executeRetryableTest'],
    },
};