"use strict";
/**
 * Entry point for classes and utilities related to using
 * {@link https://docs.temporal.io/typescript/data-converters#protobufs | Protobufs} for serialization.
 *
 * Import from `@temporalio/common/lib/protobufs`, for example:
 *
 * ```
 * import { patchProtobufRoot } from '@temporalio/common/lib/protobufs';
 * ```
 * @module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchProtobufRoot = void 0;
// Don't export from index, so we save space in Workflow bundles of users who don't use Protobufs
__exportStar(require("./converter/protobuf-payload-converters"), exports);
var patch_protobuf_root_1 = require("@temporalio/proto/lib/patch-protobuf-root");
Object.defineProperty(exports, "patchProtobufRoot", { enumerable: true, get: function () { return patch_protobuf_root_1.patchProtobufRoot; } });
//# sourceMappingURL=protobufs.js.map