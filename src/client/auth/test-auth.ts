/**
 * Test authentication utilities
 * 
 * Provides functions for creating fake JWTs for testing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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
export async function signInAsTenant(fakeTenantId: string) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { 
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
export async function createTestClient(fakeTenantId: string) {
  const { session } = await signInAsTenant(fakeTenantId);
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  
  return createClient(supabaseUrl, supabaseAnonKey, {
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