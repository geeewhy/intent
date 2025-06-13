"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.get('/api/events', async (req, res) => {
    const tenantId = req.query.tenant_id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id is required' });
    const client = await db_1.default.connect();
    try {
        const result = await client.query(`SELECT *, created_at AS "timestamp" FROM infra.events 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`, [tenantId, limit]);
        res.json(result.rows);
    }
    finally {
        client.release();
    }
});
router.get('/api/events/stream', async (req, res) => {
    const tenantId = req.query.tenant_id;
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id is required' });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const client = await db_1.default.connect();
    const channel = `events:${tenantId}`;
    await client.query(`LISTEN "${channel}"`);
    const onNotify = (msg) => {
        try {
            const event = JSON.parse(msg.payload);
            console.log("Normalized", event);
            const normalized = {
                ...event,
                status: 'processed'
            };
            res.write(`data: ${JSON.stringify(normalized)}\n\n`);
        }
        catch (error) {
            // If parsing fails, send the original payload
            res.write(`data: ${msg.payload}\n\n`);
        }
    };
    // Use type assertion to tell TypeScript that 'notification' is a valid event
    client.on('notification', onNotify);
    req.on('close', async () => {
        client.removeListener('notification', onNotify);
        await client.query(`UNLISTEN "${channel}"`);
        client.release();
        res.end();
    });
});
exports.default = router;
//# sourceMappingURL=events.js.map