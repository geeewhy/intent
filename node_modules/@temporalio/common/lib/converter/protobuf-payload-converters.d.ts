import type { Root, Type } from 'protobufjs';
import { Payload } from '../interfaces';
import { CompositePayloadConverter, PayloadConverterWithEncoding } from './payload-converter';
declare abstract class ProtobufPayloadConverter implements PayloadConverterWithEncoding {
    protected readonly root: Root | undefined;
    abstract encodingType: string;
    abstract toPayload<T>(value: T): Payload | undefined;
    abstract fromPayload<T>(payload: Payload): T;
    constructor(root?: unknown);
    protected validatePayload(content: Payload): {
        messageType: Type;
        data: Uint8Array;
    };
    protected constructPayload({ messageTypeName, message }: {
        messageTypeName: string;
        message: Uint8Array;
    }): Payload;
}
/**
 * Converts between protobufjs Message instances and serialized Protobuf Payload
 */
export declare class ProtobufBinaryPayloadConverter extends ProtobufPayloadConverter {
    encodingType: "binary/protobuf";
    /**
     * @param root The value returned from {@link patchProtobufRoot}
     */
    constructor(root?: unknown);
    toPayload(value: unknown): Payload | undefined;
    fromPayload<T>(content: Payload): T;
}
/**
 * Converts between protobufjs Message instances and serialized JSON Payload
 */
export declare class ProtobufJsonPayloadConverter extends ProtobufPayloadConverter {
    encodingType: "json/protobuf";
    /**
     * @param root The value returned from {@link patchProtobufRoot}
     */
    constructor(root?: unknown);
    toPayload(value: unknown): Payload | undefined;
    fromPayload<T>(content: Payload): T;
}
export interface DefaultPayloadConverterWithProtobufsOptions {
    /**
     * The `root` provided to {@link ProtobufJsonPayloadConverter} and {@link ProtobufBinaryPayloadConverter}
     */
    protobufRoot: Record<string, unknown>;
}
export declare class DefaultPayloadConverterWithProtobufs extends CompositePayloadConverter {
    constructor({ protobufRoot }: DefaultPayloadConverterWithProtobufsOptions);
}
export {};
