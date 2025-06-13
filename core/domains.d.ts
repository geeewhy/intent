import { CommandBus } from './command-bus';
export declare const SagaRegistry: {
    [x: string]: import("./contracts").SagaDefinition;
};
export declare function getCommandBus(): CommandBus;
