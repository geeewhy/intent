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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importStar(require("../db"));
const stdLogger_1 = require("../../infra/logger/stdLogger");
const router = (0, express_1.Router)();
router.get('/api/metrics', async (req, res) => {
    try {
        const client = await db_1.default.connect();
        try {
            // Get total number of rows in infra.commands
            const commandsResult = await client.query('SELECT COUNT(*) FROM infra.commands');
            const commands = parseInt(commandsResult.rows[0].count);
            // Get total number of rows in infra.events
            const eventsResult = await client.query('SELECT COUNT(*) FROM infra.events');
            const events = parseInt(eventsResult.rows[0].count);
            const totalEvents = events; // Same as events
            // Get total number of rows in infra.aggregates
            const aggregatesResult = await client.query('SELECT COUNT(*) FROM infra.aggregates');
            const aggregates = parseInt(aggregatesResult.rows[0].count);
            // Calculate traces (commands + events)
            const traces = commands + events;
            // Get total projections (all rows in all tables in public schema)
            const projectionsResult = await client.query(`
        SELECT SUM(n_live_tup) as total
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `);
            const projections = parseInt(projectionsResult.rows[0].total) || 0;
            const health = await (0, db_1.testConnection)() && 1;
            res.json({
                commands,
                events,
                totalEvents,
                traces,
                aggregates,
                projections,
                health
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        stdLogger_1.stdLogger.error('Metrics endpoint error:', { error });
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map