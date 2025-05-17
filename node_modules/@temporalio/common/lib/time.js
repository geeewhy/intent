"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalTsToMs = optionalTsToMs;
exports.requiredTsToMs = requiredTsToMs;
exports.tsToMs = tsToMs;
exports.msNumberToTs = msNumberToTs;
exports.msToTs = msToTs;
exports.msOptionalToTs = msOptionalToTs;
exports.msOptionalToNumber = msOptionalToNumber;
exports.msToNumber = msToNumber;
exports.tsToDate = tsToDate;
exports.requiredTsToDate = requiredTsToDate;
exports.optionalTsToDate = optionalTsToDate;
exports.optionalDateToTs = optionalDateToTs;
const long_1 = __importDefault(require("long")); // eslint-disable-line import/no-named-as-default
const ms_1 = __importDefault(require("ms"));
const errors_1 = require("./errors");
/**
 * Lossy conversion function from Timestamp to number due to possible overflow.
 * If ts is null or undefined returns undefined.
 */
function optionalTsToMs(ts) {
    if (ts === undefined || ts === null) {
        return undefined;
    }
    return tsToMs(ts);
}
/**
 * Lossy conversion function from Timestamp to number due to possible overflow.
 * If ts is null or undefined, throws a TypeError, with error message including the name of the field.
 */
function requiredTsToMs(ts, fieldName) {
    if (ts === undefined || ts === null) {
        throw new TypeError(`Expected ${fieldName} to be a timestamp, got ${ts}`);
    }
    return tsToMs(ts);
}
/**
 * Lossy conversion function from Timestamp to number due to possible overflow
 */
function tsToMs(ts) {
    if (ts === undefined || ts === null) {
        throw new Error(`Expected timestamp, got ${ts}`);
    }
    const { seconds, nanos } = ts;
    return (seconds || long_1.default.UZERO)
        .mul(1000)
        .add(Math.floor((nanos || 0) / 1000000))
        .toNumber();
}
function msNumberToTs(millis) {
    const seconds = Math.floor(millis / 1000);
    const nanos = (millis % 1000) * 1000000;
    if (Number.isNaN(seconds) || Number.isNaN(nanos)) {
        throw new errors_1.ValueError(`Invalid millis ${millis}`);
    }
    return { seconds: long_1.default.fromNumber(seconds), nanos };
}
function msToTs(str) {
    return msNumberToTs(msToNumber(str));
}
function msOptionalToTs(str) {
    return str ? msToTs(str) : undefined;
}
function msOptionalToNumber(val) {
    if (val === undefined)
        return undefined;
    return msToNumber(val);
}
function msToNumber(val) {
    if (typeof val === 'number') {
        return val;
    }
    return msWithValidation(val);
}
function msWithValidation(str) {
    const millis = (0, ms_1.default)(str);
    if (millis == null || isNaN(millis)) {
        throw new TypeError(`Invalid duration string: '${str}'`);
    }
    return millis;
}
function tsToDate(ts) {
    return new Date(tsToMs(ts));
}
// ts-prune-ignore-next
function requiredTsToDate(ts, fieldName) {
    return new Date(requiredTsToMs(ts, fieldName));
}
function optionalTsToDate(ts) {
    if (ts === undefined || ts === null) {
        return undefined;
    }
    return new Date(tsToMs(ts));
}
// ts-prune-ignore-next (imported via schedule-helpers.ts)
function optionalDateToTs(date) {
    if (date === undefined || date === null) {
        return undefined;
    }
    return msToTs(date.getTime());
}
//# sourceMappingURL=time.js.map