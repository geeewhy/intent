export declare class TextDecoder {
    decode(inputArrayOrBuffer: Uint8Array | ArrayBuffer | SharedArrayBuffer): string;
}
export declare class TextEncoder {
    encode(inputString: string): Uint8Array;
    encodeInto(inputString: string, u8Arr: Uint8Array): {
        written: number;
        read: number;
    };
}
/**
 * Encode a UTF-8 string into a Uint8Array
 */
export declare function encode(s: string): Uint8Array;
/**
 * Decode a Uint8Array into a UTF-8 string
 */
export declare function decode(a: Uint8Array): string;
