export declare const METADATA_ENCODING_KEY = "encoding";
export declare const encodingTypes: {
    readonly METADATA_ENCODING_NULL: "binary/null";
    readonly METADATA_ENCODING_RAW: "binary/plain";
    readonly METADATA_ENCODING_JSON: "json/plain";
    readonly METADATA_ENCODING_PROTOBUF_JSON: "json/protobuf";
    readonly METADATA_ENCODING_PROTOBUF: "binary/protobuf";
};
export type EncodingType = (typeof encodingTypes)[keyof typeof encodingTypes];
export declare const encodingKeys: {
    readonly METADATA_ENCODING_NULL: Uint8Array;
    readonly METADATA_ENCODING_RAW: Uint8Array;
    readonly METADATA_ENCODING_JSON: Uint8Array;
    readonly METADATA_ENCODING_PROTOBUF_JSON: Uint8Array;
    readonly METADATA_ENCODING_PROTOBUF: Uint8Array;
};
export declare const METADATA_MESSAGE_TYPE_KEY = "messageType";
