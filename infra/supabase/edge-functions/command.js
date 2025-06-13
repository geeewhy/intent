"use strict";
/**
 * Edge Function for handling commands
 *
 * Validates JWT, extracts tenant_id, and inserts commands into the database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const uuid_1 = require("uuid");
// Define the request handler
const handler = async (req) => {
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Extract the JWT token
        const token = authHeader.split(' ')[1];
        // Create a Supabase client
        // The client will automatically use the JWT for authentication
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
        // Set the auth token (using setSession instead of deprecated setAuth)
        await supabase.auth.setSession({
            access_token: token,
            refresh_token: ''
        });
        // Get the user from the JWT
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Extract the tenant_id from the JWT claims
        // @ts-ignore - custom claims are not in the type definition
        const tenantId = user.app_metadata?.tenant_id;
        if (!tenantId) {
            return new Response(JSON.stringify({ error: 'Missing tenant_id claim' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Parse the request body
        const body = await req.json();
        if (!body.type || !body.payload) {
            return new Response(JSON.stringify({ error: 'Invalid command format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Create a command object
        const command = {
            id: body.id || (0, uuid_1.v4)(),
            tenant_id: tenantId,
            type: body.type,
            payload: body.payload,
            created_at: new Date().toISOString(),
            status: 'pending'
        };
        // Insert the command into the database
        // Supabase will enforce RLS policies based on the JWT
        const { error: insertError } = await supabase
            .from('infra.commands')
            .insert(command);
        if (insertError) {
            console.error('Error inserting command:', insertError);
            return new Response(JSON.stringify({ error: 'Failed to process command' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Return success
        return new Response(JSON.stringify({
            success: true,
            message: 'Command received',
            commandId: command.id
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Unexpected error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
exports.handler = handler;
//# sourceMappingURL=command.js.map