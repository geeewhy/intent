/**
 * Shared Supabase client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with admin privileges
 */
export const sbAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { 
    auth: { 
      persistSession: false, 
      autoRefreshToken: false 
    },
    global: {
      headers: {
        'x-supabase-auth-role': 'service_role'
      }
    }
  }
);