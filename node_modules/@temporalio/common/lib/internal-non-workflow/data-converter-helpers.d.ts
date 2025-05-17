import { DataConverter, LoadedDataConverter } from '../converter/data-converter';
/**
 * If {@link DataConverter.payloadConverterPath} is specified, `require()` it and validate that the module has a `payloadConverter` named export.
 * If not, use {@link defaultPayloadConverter}.
 * If {@link DataConverter.payloadCodecs} is unspecified, use an empty array.
 */
export declare function loadDataConverter(dataConverter?: DataConverter): LoadedDataConverter;
/**
 * Returns true if the converter is already "loaded"
 */
export declare function isLoadedDataConverter(dataConverter?: DataConverter | LoadedDataConverter): dataConverter is LoadedDataConverter;
