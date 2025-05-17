"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDataConverter = exports.defaultFailureConverter = void 0;
const failure_converter_1 = require("./failure-converter");
const payload_converter_1 = require("./payload-converter");
/**
 * The default {@link FailureConverter} used by the SDK.
 *
 * Error messages and stack traces are serizalized as plain text.
 */
exports.defaultFailureConverter = new failure_converter_1.DefaultFailureConverter();
/**
 * A "loaded" data converter that uses the default set of failure and payload converters.
 */
exports.defaultDataConverter = {
    payloadConverter: payload_converter_1.defaultPayloadConverter,
    failureConverter: exports.defaultFailureConverter,
    payloadCodecs: [],
};
//# sourceMappingURL=data-converter.js.map