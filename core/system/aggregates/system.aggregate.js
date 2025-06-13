"use strict";
// src/core/system/aggregates/system.aggregate.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemAggregate = void 0;
const aggregate_1 = require("../../base/aggregate");
const errors_1 = require("../../errors");
const contracts_1 = require("../contracts");
const event_factory_1 = require("../../shared/event-factory");
const policy_registry_1 = require("../../policy-registry");
const command_access_1 = require("../command-access");
class SystemAggregate extends aggregate_1.BaseAggregate {
    constructor(id) {
        super(id);
        this.aggregateType = 'system';
        this.version = 0;
        this.numberExecutedTests = 0;
        this.lastExecutedTestName = '';
        this.retries = 0;
        this.handlers = {
            [contracts_1.SystemCommandType.LOG_MESSAGE]: this.handleLogMessage.bind(this),
            [contracts_1.SystemCommandType.SIMULATE_FAILURE]: this.handleSimulateFailure.bind(this),
            [contracts_1.SystemCommandType.EMIT_MULTIPLE_EVENTS]: this.handleEmitMultipleEvents.bind(this),
            [contracts_1.SystemCommandType.EXECUTE_TEST]: this.handleExecuteTest.bind(this),
            [contracts_1.SystemCommandType.EXECUTE_RETRYABLE_TEST]: this.handleExecuteRetryableTest.bind(this),
        };
        this.id = id;
    }
    static create(cmd) {
        return new SystemAggregate(cmd.payload.systemId || 'system');
    }
    static rehydrate(events) {
        if (!events.length) {
            throw new Error('Cannot rehydrate from empty events');
        }
        const base = new SystemAggregate(events[0].aggregateId);
        events.forEach(event => base.apply(event, false));
        return base;
    }
    handle(cmd) {
        const handler = this.handlers[cmd.type];
        if (!handler)
            throw new Error(`Unknown command type: ${cmd.type}`);
        return handler(cmd);
    }
    apply(event, isNew = true) {
        switch (event.type) {
            case contracts_1.SystemEventType.MESSAGE_LOGGED:
                this.applyMessageLogged(event);
                break;
            case contracts_1.SystemEventType.FAILURE_SIMULATED:
                this.applyFailureSimulated(event);
                break;
            case contracts_1.SystemEventType.MULTI_EVENT_EMITTED:
                this.applyMultiEventEmitted(event);
                break;
            case contracts_1.SystemEventType.TEST_EXECUTED:
                this.applyTestExecuted(event);
                break;
            case contracts_1.SystemEventType.RETRYABLE_TEST_EXECUTED:
                this.applyRetryableTestExecuted(event);
                break;
            default:
                throw new Error(`Unknown event type: ${event.type}`);
        }
        if (isNew) {
            this.version++;
        }
        else {
            this.version = event.version;
        }
    }
    handleLogMessage(cmd) {
        const payload = { ...cmd.payload, systemId: this.id };
        const event = (0, event_factory_1.buildEvent)(cmd.tenant_id, this.id, this.aggregateType, contracts_1.SystemEventType.MESSAGE_LOGGED, this.version, payload, {
            userId: cmd.metadata?.userId,
            correlationId: cmd.metadata?.correlationId,
            causationId: cmd.id,
        });
        this.apply(event);
        return [event];
    }
    handleSimulateFailure(_) {
        throw new errors_1.BusinessRuleViolation('Simulated failure', undefined, true);
    }
    handleEmitMultipleEvents(cmd) {
        const events = [];
        for (let i = 0; i < cmd.payload.count; i++) {
            const payload = {
                index: i,
                systemId: this.id,
            };
            const event = (0, event_factory_1.buildEvent)(cmd.tenant_id, this.id, this.aggregateType, contracts_1.SystemEventType.MULTI_EVENT_EMITTED, this.version + i, payload, {
                userId: cmd.metadata?.userId,
                correlationId: cmd.metadata?.correlationId,
                causationId: cmd.id,
            });
            events.push(event);
        }
        return events;
    }
    handleExecuteTest(cmd) {
        if (!cmd.metadata?.userId) {
            throw new errors_1.BusinessRuleViolation(`User ID is required for test execution`);
        }
        const accessContext = {
            role: cmd.metadata?.role ?? 'unknown', // or throw if not present
            userId: cmd.metadata?.userId
        };
        if (!(0, policy_registry_1.isCommandAllowed)(command_access_1.GeneratedSystemCommandConditions.EXECUTETEST, accessContext)) {
            throw new errors_1.BusinessRuleViolation(`User ${cmd.metadata.userId} does not have access to execute test`);
        }
        const now = new Date();
        const payload = {
            testId: cmd.payload.testId,
            testName: cmd.payload.testName,
            testerId: cmd.metadata.userId,
            result: 'success',
            executedAt: now,
            numberExecutedTests: this.numberExecutedTests + 1,
            parameters: cmd.payload.parameters,
            systemId: this.id,
        };
        const event = (0, event_factory_1.buildEvent)(cmd.tenant_id, this.id, this.aggregateType, contracts_1.SystemEventType.TEST_EXECUTED, this.version, payload, {
            userId: cmd.metadata?.userId,
            correlationId: cmd.metadata?.correlationId,
            causationId: cmd.id,
        });
        return [event];
    }
    handleExecuteRetryableTest(cmd) {
        if (this.version % 2 === 0) {
            throw new errors_1.BusinessRuleViolation('Retryable error', {
                'message': `Increase version by cmds resulting application of other events`,
                'currentVersion': this.version,
                'versionToSucceed': this.version + 1
            }, true);
        }
        const now = new Date();
        const payload = {
            testId: cmd.payload.testId,
            testName: cmd.payload.testName,
            result: 'success',
            executedAt: now,
            parameters: cmd.payload.parameters,
            systemId: this.id,
        };
        const event = (0, event_factory_1.buildEvent)(cmd.tenant_id, this.id, this.aggregateType, contracts_1.SystemEventType.RETRYABLE_TEST_EXECUTED, this.version, payload, {
            userId: cmd.metadata?.userId,
            correlationId: cmd.metadata?.correlationId,
            causationId: cmd.id,
        });
        return [event];
    }
    applyMessageLogged(_) {
        // no-op
    }
    applyFailureSimulated(_) {
        // no-op
    }
    applyMultiEventEmitted(_) {
        // no-op
    }
    applyTestExecuted(_) {
        this.numberExecutedTests++;
        this.lastExecutedTestName = _.payload.testName;
    }
    applyRetryableTestExecuted(_) {
        this.retries++;
    }
    upcastSnapshotState(raw, version) {
        return raw;
    }
    applyUpcastedSnapshot(state) {
        this.numberExecutedTests = state.numberExecutedTests;
    }
    extractSnapshotState() {
        const state = {
            numberExecutedTests: this.numberExecutedTests,
            retries: this.retries,
        };
        if (this.lastExecutedTestName) {
            state.testName = this.lastExecutedTestName;
        }
        return state;
    }
    getId() {
        return this.id;
    }
    getVersion() {
        return this.version;
    }
}
exports.SystemAggregate = SystemAggregate;
SystemAggregate.CURRENT_SCHEMA_VERSION = 1;
SystemAggregate.COMMAND_LIST = [
    contracts_1.SystemCommandType.LOG_MESSAGE,
    contracts_1.SystemCommandType.SIMULATE_FAILURE,
    contracts_1.SystemCommandType.EMIT_MULTIPLE_EVENTS,
    contracts_1.SystemCommandType.EXECUTE_TEST,
    contracts_1.SystemCommandType.EXECUTE_RETRYABLE_TEST,
];
//# sourceMappingURL=system.aggregate.js.map