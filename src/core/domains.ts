// core/domains.ts
import { orderSagaRegistry } from './order';
import { systemSagaRegistry } from './system';

export const SagaRegistry = {
    ...orderSagaRegistry,
    ...systemSagaRegistry,
    // ...future core
};
