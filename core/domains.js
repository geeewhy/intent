"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaRegistry = void 0;
exports.getCommandBus = getCommandBus;
// core/domains.ts
const system_1 = require("./system");
const command_bus_1 = require("./command-bus");
exports.SagaRegistry = {
    ...system_1.systemSagaRegistry,
};
let _commandBus;
function getCommandBus() {
    if (!_commandBus) {
        _commandBus = new command_bus_1.CommandBus();
        _commandBus.register(new system_1.SystemCommandHandler());
        // register more domain handlers here
    }
    return _commandBus;
}
//# sourceMappingURL=domains.js.map