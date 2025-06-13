"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const stdLogger_1 = require("../../infra/logger/stdLogger");
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    try {
        const dbStatus = await (0, db_1.testConnection)();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus
        });
    }
    catch (error) {
        stdLogger_1.stdLogger.error('Health check error:', { error });
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map