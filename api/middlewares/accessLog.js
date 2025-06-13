"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessLogMiddleware = void 0;
const apiLogger_1 = require("../../infra/logger/apiLogger");
/**
 * Access logging middleware
 * Logs information about incoming requests at info level
 */
const accessLogMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Log request details when the response is finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : 'unknown';
        apiLogger_1.apiLogger.info('Access log', {
            operation: 'accessLogMiddleware',
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration: duration,
            tenantId,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent')
        });
    });
    next();
};
exports.accessLogMiddleware = accessLogMiddleware;
exports.default = exports.accessLogMiddleware;
//# sourceMappingURL=accessLog.js.map