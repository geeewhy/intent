"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = generateUUID;
const crypto_1 = __importDefault(require("crypto"));
async function generateUUID() {
    return crypto_1.default.randomUUID();
}
//# sourceMappingURL=index.js.map