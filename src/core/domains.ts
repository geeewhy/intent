// core/domains.ts
import { systemSagaRegistry, SystemCommandHandler } from './example-slices/system';
import { CommandBus } from './command-bus';

export const SagaRegistry = {
    ...systemSagaRegistry,
};

let _commandBus: CommandBus;
export function getCommandBus(): CommandBus {
    if (!_commandBus) {
        _commandBus = new CommandBus();
        _commandBus.register(new SystemCommandHandler());
        // register more domain handlers here
    }
    return _commandBus;
}
