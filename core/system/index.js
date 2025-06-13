"use strict";
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
exports.activities = exports.systemSagaRegistry = exports.SystemAggregate = exports.SystemSaga = void 0;
__exportStar(require("./contracts"), exports);
__exportStar(require("./command-access"), exports);
__exportStar(require("./command-handler"), exports);
var system_saga_1 = require("./sagas/system.saga");
Object.defineProperty(exports, "SystemSaga", { enumerable: true, get: function () { return system_saga_1.SystemSaga; } });
var system_aggregate_1 = require("./aggregates/system.aggregate");
Object.defineProperty(exports, "SystemAggregate", { enumerable: true, get: function () { return system_aggregate_1.SystemAggregate; } });
var saga_registry_1 = require("./sagas/saga-registry");
Object.defineProperty(exports, "systemSagaRegistry", { enumerable: true, get: function () { return saga_registry_1.systemSagaRegistry; } });
exports.activities = {};
//# sourceMappingURL=index.js.map