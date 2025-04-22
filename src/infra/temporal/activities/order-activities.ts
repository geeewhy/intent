/**
 * Temporal activities for order processing
 */

import { Command } from '../../../domain/contracts';
import { PgEventStore } from '../../pg/pg-event-store';

/**
 * Record a command in the database
 */
export async function recordCommand(cmd: Command): Promise<void> {
  console.log(`[OrderActivities] Recording command: ${cmd.type} for tenant: ${cmd.tenant}`);

  try {
    // Connect to the database
    const eventStore = new PgEventStore();

    // Insert the command into the commands table
    // This would typically be done through a dedicated CommandStore adapter
    // but for simplicity, we're using direct SQL queries
    const client = await eventStore['pool'].connect();

    try {
      await client.query(`
        INSERT INTO commands (tenant_id, id, type, payload, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET status = $5, updated_at = $7
      `, [
        cmd.tenant,
        cmd.id,
        cmd.type,
        JSON.stringify(cmd.payload),
        'processing',
        cmd.metadata?.timestamp || new Date(),
        new Date()
      ]);
    } finally {
      client.release();
    }

    console.log(`[OrderActivities] Command recorded: ${cmd.type}`);
  } catch (error) {
    console.error(`[OrderActivities] Error recording command:`, error);
    throw error;
  }
}

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
