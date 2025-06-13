/**
 * Shared Supabase client
 */
import { SupabaseClient } from '@supabase/supabase-js';
/**
 * Create a Supabase client with admin privileges
 */
export declare const sbAdmin: SupabaseClient<any, "public", any>;
