"use strict";
//command-helpers.ts
/**
 * Command helpers for pump workers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.markFailed = exports.markConsumed = void 0;
const supabase_client_1 = require("./supabase-client");
/**
 * Mark a command as consumed (workflow started)
 * @param id The command ID
 */
const markConsumed = (id, res) => supabase_client_1.sbAdmin.from('infra.commands').update({ status: res.status }).eq('id', id);
exports.markConsumed = markConsumed;
/**
 * Mark a command as failed
 * @param id The command ID
 * @param err The error that occurred
 */
const markFailed = (id, err) => supabase_client_1.sbAdmin.from('infra.commands').update({
    status: 'failed',
    error_message: err.message
}).eq('id', id);
exports.markFailed = markFailed;
//# sourceMappingURL=command-helpers.js.map