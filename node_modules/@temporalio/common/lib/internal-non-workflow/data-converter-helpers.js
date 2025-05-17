"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDataConverter = loadDataConverter;
exports.isLoadedDataConverter = isLoadedDataConverter;
const payload_converter_1 = require("../converter/payload-converter");
const data_converter_1 = require("../converter/data-converter");
const type_helpers_1 = require("../type-helpers");
const errors_1 = require("../errors");
const isValidPayloadConverter = (converter, path) => {
    const isValid = typeof converter === 'object' &&
        converter !== null &&
        ['toPayload', 'fromPayload'].every((method) => typeof converter[method] === 'function');
    if (!isValid) {
        throw new errors_1.ValueError(`payloadConverter export at ${path} must be an object with toPayload and fromPayload methods`);
    }
};
const isValidFailureConverter = (converter, path) => {
    const isValid = typeof converter === 'object' &&
        converter !== null &&
        ['errorToFailure', 'failureToError'].every((method) => typeof converter[method] === 'function');
    if (!isValid) {
        throw new errors_1.ValueError(`failureConverter export at ${path} must be an object with errorToFailure and failureToError methods`);
    }
};
function requireConverter(path, type, validator) {
    let module;
    try {
        module = require(path); // eslint-disable-line @typescript-eslint/no-require-imports
    }
    catch (error) {
        if ((0, type_helpers_1.errorCode)(error) === 'MODULE_NOT_FOUND') {
            throw new errors_1.ValueError(`Could not find a file at the specified ${type}Path: '${path}'.`);
        }
        throw error;
    }
    if ((0, type_helpers_1.isRecord)(module) && (0, type_helpers_1.hasOwnProperty)(module, type)) {
        const converter = module[type];
        validator(converter, path);
        return converter;
    }
    else {
        throw new errors_1.ValueError(`Module ${path} does not have a \`${type}\` named export`);
    }
}
/**
 * If {@link DataConverter.payloadConverterPath} is specified, `require()` it and validate that the module has a `payloadConverter` named export.
 * If not, use {@link defaultPayloadConverter}.
 * If {@link DataConverter.payloadCodecs} is unspecified, use an empty array.
 */
function loadDataConverter(dataConverter) {
    let payloadConverter = payload_converter_1.defaultPayloadConverter;
    if (dataConverter?.payloadConverterPath) {
        payloadConverter = requireConverter(dataConverter.payloadConverterPath, 'payloadConverter', isValidPayloadConverter);
    }
    let failureConverter = data_converter_1.defaultFailureConverter;
    if (dataConverter?.failureConverterPath) {
        failureConverter = requireConverter(dataConverter.failureConverterPath, 'failureConverter', isValidFailureConverter);
    }
    return {
        payloadConverter,
        failureConverter,
        payloadCodecs: dataConverter?.payloadCodecs ?? [],
    };
}
/**
 * Returns true if the converter is already "loaded"
 */
function isLoadedDataConverter(dataConverter) {
    return (0, type_helpers_1.isRecord)(dataConverter) && (0, type_helpers_1.hasOwnProperty)(dataConverter, 'payloadConverter');
}
//# sourceMappingURL=data-converter-helpers.js.map