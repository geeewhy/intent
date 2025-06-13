"use strict";
/**
 * Generic pump for Supabase real-time events
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimePumpBase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Generic real-time pump base class
 */
class RealtimePumpBase {
    /**
     * Constructor
     * @param cfg Pump configuration
     */
    constructor(cfg) {
        this.cfg = cfg;
        this.queue = [];
        this.draining = false;
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
        }
        this.sb = (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { 'x-supabase-auth-role': 'service_role' } },
            realtime: { params: { eventsPerSecond: 20 } }
        });
    }
    /**
     * Start the pump
     */
    async start() {
        console.log(`[Pump] start ${this.cfg.channel}`);
        await this.sb.channel(this.cfg.channel)
            .on('postgres_changes', this.cfg.eventSpec, (payload) => {
            console.log('NEW ROW', payload.new.id);
            const row = payload.new;
            if (row && this.cfg.validate(row)) {
                this.queue.push(row);
            }
        })
            .subscribe((status, err) => {
            console.log(`[Pump] ${this.cfg.channel} status=${status}`, err?.message ? err.message : '[NO ERROR]');
        });
        // Drain loop
        setInterval(() => this.drain(), 25); // ~40 Hz
    }
    /**
     * Drain the queue
     */
    async drain() {
        if (this.draining || this.queue.length === 0) {
            return;
        }
        this.draining = true;
        try {
            const batchSize = this.cfg.batchSize ?? 50;
            const batch = this.queue.splice(0, batchSize);
            await this.cfg.processBatch(batch);
        }
        catch (e) {
            console.error('[Pump] batch error', e);
        }
        finally {
            this.draining = false;
        }
    }
}
exports.RealtimePumpBase = RealtimePumpBase;
//# sourceMappingURL=realtime-pump-base.js.map