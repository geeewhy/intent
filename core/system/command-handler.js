"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemCommandHandler = void 0;
const system_aggregate_1 = require("./aggregates/system.aggregate");
const contracts_1 = require("./contracts");
class SystemCommandHandler {
    supportsCommand(cmd) {
        return Object.values(contracts_1.SystemCommandType).includes(cmd.type);
    }
    async handleWithAggregate(cmd, aggregate) {
        if (!(aggregate instanceof system_aggregate_1.SystemAggregate)) {
            throw new Error(`Expected SystemAggregate but got ${aggregate.constructor.name} for cmd: ${cmd.type}`);
        }
        return aggregate.handle(cmd);
    }
}
exports.SystemCommandHandler = SystemCommandHandler;
//# sourceMappingURL=command-handler.js.map