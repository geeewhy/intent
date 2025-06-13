"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apiLogger_1 = require("../infra/logger/apiLogger");
const logger_1 = require("../core/logger");
(0, logger_1.setLoggerAccessor)(() => apiLogger_1.apiLogger);
exports.default = apiLogger_1.apiLogger;
//# sourceMappingURL=logger.js.map