"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const health_1 = __importDefault(require("./health"));
const registry_1 = __importDefault(require("./registry"));
const metrics_1 = __importDefault(require("./metrics"));
const commands_1 = __importDefault(require("./commands"));
const events_1 = __importDefault(require("./events"));
const logs_1 = __importDefault(require("./logs"));
const accessLog_1 = __importDefault(require("../middlewares/accessLog"));
/**
 * Register all API routes
 * @param app Express application instance
 */
const registerRoutes = (app) => {
    // Register access logging middleware
    app.use(accessLog_1.default);
    // Register health routes
    app.use(health_1.default);
    // Register registry routes
    app.use(registry_1.default);
    // Register metrics routes
    app.use(metrics_1.default);
    // Register commands routes
    app.use(commands_1.default);
    // Register events routes
    app.use(events_1.default);
    // Register logs routes
    app.use(logs_1.default);
};
exports.registerRoutes = registerRoutes;
exports.default = exports.registerRoutes;
//# sourceMappingURL=index.js.map