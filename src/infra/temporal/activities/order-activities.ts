/**
 * Temporal activities for order processing
 */

/**
 * Notify a user with a message
 */
export async function notifyUser(userId: string, message: string): Promise<void> {
  console.log(`[OrderActivities] Notifying user: ${userId} with message: ${message}`);

  try {
    // In a real implementation, this would send a notification to the user
    // via email, push notification, SMS, etc.
    // For now, we'll just log the message

    console.log(`[OrderActivities] User notified: ${userId}`);
  } catch (error) {
    console.error(`[OrderActivities] Error notifying user:`, error);
    throw error;
  }
}

/**
 * Update an order's status
 */
export async function updateOrderStatus(orderId: string, tenantId: string, status: string): Promise<void> {
  console.log(`[OrderActivities] Updating order status: ${orderId} to ${status} for tenant: ${tenantId}`);

  try {
    // In a real implementation, this would create and dispatch a command
    // to update the order status through the domain service
    // For now, we'll just log the update

    console.log(`[OrderActivities] Order status updated: ${orderId} to ${status}`);
  } catch (error) {
    console.error(`[OrderActivities] Error updating order status:`, error);
    throw error;
  }
}

/**
 * Schedule a reminder for an order
 */
export async function scheduleReminder(orderId: string, tenantId: string, delayInMinutes: number): Promise<void> {
  console.log(`[OrderActivities] Scheduling reminder for order: ${orderId} in ${delayInMinutes} minutes for tenant: ${tenantId}`);

  try {
    // In a real implementation, this would schedule a reminder
    // through a notification service or another Temporal workflow
    // For now, we'll just log the reminder

    console.log(`[OrderActivities] Reminder scheduled: ${orderId} in ${delayInMinutes} minutes`);
  } catch (error) {
    console.error(`[OrderActivities] Error scheduling reminder:`, error);
    throw error;
  }
}

/**
 * Mark a command as processed (workflow successfully finished)
 */
export async function markCommandAsProcessed(commandId: string, tenantId: string): Promise<void> {
  console.log(`[OrderActivities] Marking command as processed: ${commandId} for tenant: ${tenantId}`);

  try {
    // Use Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[OrderActivities] Supabase URL and service role key are required. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    // Import createClient dynamically to avoid circular dependencies
    const { createClient } = await import('@supabase/supabase-js');

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false, // No need to refresh with service role
      },
      global: {
        headers: {
          // Set header to identify this as a service and bypass RLS
          'x-supabase-auth-role': 'service_role'
        }
      }
    });

    // Update the command status in the database
    const { error } = await supabase
      .from('commands')
      .update({
        status: 'processed',
        updated_at: new Date().toISOString()
      })
      .eq('id', commandId);

    if (error) {
      throw error;
    }

    console.log(`[OrderActivities] Command marked as processed: ${commandId}`);
  } catch (error) {
    console.error(`[OrderActivities] Error marking command as processed: ${commandId}`, error);
    throw error;
  }
}
