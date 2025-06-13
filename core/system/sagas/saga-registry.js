"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemSagaRegistry = void 0;
const system_saga_1 = require("./system.saga");
exports.systemSagaRegistry = {
    systemSaga: {
        idFor: (msg) => {
            if (!system_saga_1.SystemSaga.reactsTo().includes(msg.type))
                return undefined;
            const aggregateId = 'aggregateId' in msg ? msg.aggregateId : msg.payload?.aggregateId;
            return system_saga_1.SystemSaga.reactsTo().includes(msg.type) ? `${msg.tenant_id}_${aggregateId}` : undefined;
        },
        plan: system_saga_1.SystemSaga.react,
        workflow: 'processSaga', // optional override
    },
};
//# sourceMappingURL=saga-registry.js.map