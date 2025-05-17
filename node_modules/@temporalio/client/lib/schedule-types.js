"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeScheduleOverlapPolicy = exports.encodeScheduleOverlapPolicy = exports.ScheduleOverlapPolicy = exports.DAYS_OF_WEEK = exports.MONTHS = void 0;
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
const internal_workflow_1 = require("@temporalio/common/lib/internal-workflow");
// Invariant: ScheduleDescription contains at least the same fields as ScheduleSummary
(0, type_helpers_1.checkExtends)();
// Invariant: An existing ScheduleDescription can be used as template to create a new Schedule
(0, type_helpers_1.checkExtends)();
// Invariant: An existing ScheduleDescription can be used as template to update that Schedule
(0, type_helpers_1.checkExtends)();
// Invariant: An existing ScheduleSpec can be used as is to create or update a Schedule
(0, type_helpers_1.checkExtends)();
exports.MONTHS = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
];
exports.DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
// Invariant: an existing ScheduleDescriptionAction can be used as is to create or update a schedule
(0, type_helpers_1.checkExtends)();
/**
 * Policy for overlapping Actions.
 */
exports.ScheduleOverlapPolicy = {
    /**
     * Don't start a new Action.
     * @default
     */
    SKIP: 'SKIP',
    /**
     * Start another Action as soon as the current Action completes, but only buffer one Action in this way. If another
     * Action is supposed to start, but one Action is running and one is already buffered, then only the buffered one will
     * be started after the running Action finishes.
     */
    BUFFER_ONE: 'BUFFER_ONE',
    /**
     * Allows an unlimited number of Actions to buffer. They are started sequentially.
     */
    BUFFER_ALL: 'BUFFER_ALL',
    /**
     * Cancels the running Action, and then starts the new Action once the cancelled one completes.
     */
    CANCEL_OTHER: 'CANCEL_OTHER',
    /**
     * Terminate the running Action and start the new Action immediately.
     */
    TERMINATE_OTHER: 'TERMINATE_OTHER',
    /**
     * Allow any number of Actions to start immediately.
     *
     * This is the only policy under which multiple Actions can run concurrently.
     */
    ALLOW_ALL: 'ALLOW_ALL',
    /**
     * Use server default (currently SKIP).
     *
     * @deprecated Either leave property `undefined`, or use {@link SKIP} instead.
     */
    UNSPECIFIED: undefined, // eslint-disable-line deprecation/deprecation
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.ScheduleOverlapPolicy.SKIP]: 1,
    [exports.ScheduleOverlapPolicy.BUFFER_ONE]: 2,
    [exports.ScheduleOverlapPolicy.BUFFER_ALL]: 3,
    [exports.ScheduleOverlapPolicy.CANCEL_OTHER]: 4,
    [exports.ScheduleOverlapPolicy.TERMINATE_OTHER]: 5,
    [exports.ScheduleOverlapPolicy.ALLOW_ALL]: 6,
    UNSPECIFIED: 0,
}, 'SCHEDULE_OVERLAP_POLICY_'), exports.encodeScheduleOverlapPolicy = _a[0], exports.decodeScheduleOverlapPolicy = _a[1];
//# sourceMappingURL=schedule-types.js.map