"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeActivityCancellationType = exports.encodeActivityCancellationType = exports.ActivityCancellationType = void 0;
const internal_workflow_1 = require("./internal-workflow");
exports.ActivityCancellationType = {
    TRY_CANCEL: 'TRY_CANCEL',
    WAIT_CANCELLATION_COMPLETED: 'WAIT_CANCELLATION_COMPLETED',
    ABANDON: 'ABANDON',
};
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.ActivityCancellationType.TRY_CANCEL]: 0,
    [exports.ActivityCancellationType.WAIT_CANCELLATION_COMPLETED]: 1,
    [exports.ActivityCancellationType.ABANDON]: 2,
}, ''), exports.encodeActivityCancellationType = _a[0], exports.decodeActivityCancellationType = _a[1];
//# sourceMappingURL=activity-options.js.map