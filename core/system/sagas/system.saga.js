"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSaga = void 0;
const observability_1 = require("../../shared/observability");
const command_factory_1 = require("../../shared/command-factory");
const metadata_1 = require("../../shared/metadata");
const logger_1 = require("../../logger");
const contracts_1 = require("../contracts");
class SystemSaga {
    static reactsTo() {
        return [
            contracts_1.SystemEventType.MULTI_EVENT_EMITTED,
            contracts_1.SystemCommandType.EMIT_MULTIPLE_EVENTS,
            // Add other event types that the saga should react to
        ];
    }
    static async react(input, ctx) {
        const plan = { commands: [], delays: [] };
        const tenantId = input.tenant_id;
        const baseMeta = (0, metadata_1.inheritMetadata)(input, ctx, { source: this.sagaName });
        const logger = (0, logger_1.createLoggerForSaga)(SystemSaga);
        logger?.info('Saga triggered', {
            triggeredByType: input.type,
            triggeredById: input.id,
            input
        });
        switch (input.type) {
            case contracts_1.SystemCommandType.EMIT_MULTIPLE_EVENTS: {
                plan.delays?.push({
                    cmd: (0, command_factory_1.buildCommand)(await ctx.nextId(), tenantId, contracts_1.SystemCommandType.LOG_MESSAGE, {
                        aggregateType: 'system',
                        aggregateId: input.payload.aggregateId,
                        count: input.payload.count,
                        systemId: input.payload.systemId,
                        message: 'auto-trigger delayed from saga',
                    }, {
                        ...baseMeta,
                        causationId: input.id,
                    }),
                    ms: 3000,
                });
                break;
            }
            case contracts_1.SystemEventType.MULTI_EVENT_EMITTED: {
                if (input.payload.index === 2) {
                    plan.commands = [
                        (0, command_factory_1.buildCommand)(await ctx.nextId(), tenantId, contracts_1.SystemCommandType.LOG_MESSAGE, {
                            aggregateType: 'system',
                            aggregateId: input.payload.systemId,
                            message: 'auto-trigger immediate from saga',
                        }, {
                            ...baseMeta,
                            causationId: input.id,
                        })
                    ];
                    (0, observability_1.trace)(ctx, 'SystemSaga:MULTI_EVENT_EMITTED', {
                        index: input.payload.index,
                        systemId: input.payload.systemId || ('aggregateId' in input ? input.aggregateId : undefined),
                        triggeredBy: input.type,
                    });
                }
                break;
            }
            // Add cases for other event types
        }
        return plan;
    }
}
exports.SystemSaga = SystemSaga;
SystemSaga.sagaName = 'saga:' + SystemSaga.name;
//# sourceMappingURL=system.saga.js.map