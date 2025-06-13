"use strict";
/**
 * Shared Supabase client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sbAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Create a Supabase client with admin privileges
 */
exports.sbAdmin = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    global: {
        headers: {
            'x-supabase-auth-role': 'service_role'
        }
    }
});
//# sourceMappingURL=supabase-client.js.map