import type { Command } from '../../../core/contracts';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: { 'x-supabase-auth-role': 'service_role' }
        }
    }
);

/**
 * Dispatch a command by inserting it into the `commands` table
 * This will be picked up by the CommandPump to run via Temporal
 */
export async function dispatchCommand(cmd: Command): Promise<void> {
    const { error } = await supabase
        .from('commands')
        .insert([{ ...cmd, status: 'pending', created_at: new Date() }]);

    if (error) {
        console.error(`[dispatchCommand] Failed to insert command ${cmd.type}:`, error);
        throw error;
    }

    console.log(`[dispatchCommand] Dispatched command: ${cmd.type} (${cmd.id})`);
}
