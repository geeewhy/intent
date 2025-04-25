// core/domain.ts
import { orderSagaRegistry } from './order';


export const SagaRegistry = {
    ...orderSagaRegistry,
    // ...future core
};

// use: SagaRegistry['orderSaga'].plan(cmd)