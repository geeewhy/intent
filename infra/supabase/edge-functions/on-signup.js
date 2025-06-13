"use strict";
/**
 * Edge Function for handling user signup
 *
 * Creates a profile for the new user and assigns them to a household
 * Updates the user's metadata with the household_id
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
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
        // Parse the request body
        const body = await req.json();
        if (!body.user || !body.user.id) {
            return new Response(JSON.stringify({ error: 'Invalid request format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Extract the user ID
        const userId = body.user.id;
        // Create a Supabase admin client
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        // Create a new household or use an existing one if specified
        let householdId = body.household_id;
        let householdName = body.household_name || 'New Household';
        if (!householdId) {
            // Create a new household
            const { data: household, error: householdError } = await supabase
                .from('households')
                .insert({ name: householdName })
                .select('id')
                .single();
            if (householdError) {
                console.error('Error creating household:', householdError);
                return new Response(JSON.stringify({ error: 'Failed to create household' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            householdId = household.id;
        }
        // Create a profile for the user
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
            user_id: userId,
            household_id: householdId,
            role: body.role || 'member'
        });
        if (profileError) {
            console.error('Error creating profile:', profileError);
            return new Response(JSON.stringify({ error: 'Failed to create profile' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Update the user's metadata with the household_id
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { household_id: householdId }
        });
        if (updateError) {
            console.error('Error updating user metadata:', updateError);
            return new Response(JSON.stringify({ error: 'Failed to update user metadata' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Return success
        return new Response(JSON.stringify({
            success: true,
            message: 'User profile created',
            userId,
            householdId
        }), {
            status: 200,
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
//# sourceMappingURL=on-signup.js.map