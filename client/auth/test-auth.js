"use strict";
/**
 * Test authentication utilities
 *
 * Provides functions for creating fake JWTs for testing
 */
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
exports.signInAsTenant = signInAsTenant;
exports.createTestClient = createTestClient;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
/**
 * Sign in as a tenant for testing
 *
 * Creates a fake JWT with a test_tenant_id claim
 *
 * @param fakeTenantId The tenant ID to use in the JWT
 * @returns An object with the session and tenant ID
 */
async function signInAsTenant(fakeTenantId) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false
        }
    });
    // Sign in with a fake token that includes test_tenant_id
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'external',
        token: JSON.stringify({
            sub: 'test-user',
            role: 'authenticated',
            test_tenant_id: fakeTenantId
        })
    });
    if (error) {
        throw error;
    }
    if (!data.session) {
        throw new Error('Failed to create test session');
    }
    return {
        session: data.session,
        tenantId: fakeTenantId
    };
}
/**
 * Create a Supabase client with test authentication
 *
 * @param fakeTenantId The tenant ID to use in the JWT
 * @returns A Supabase client with the test JWT
 */
async function createTestClient(fakeTenantId) {
    const { session } = await signInAsTenant(fakeTenantId);
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        global: {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    });
}
//# sourceMappingURL=test-auth.js.map