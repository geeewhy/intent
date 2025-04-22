/**
 * Temporal workflows for order processing
 */

import { proxyActivities } from '@temporalio/workflow';
import { Command, OrderEventType } from '../../../domain/contracts';

// Define the activities interface
interface OrderActivities {
  recordCommand(cmd: Command): Promise<void>;
  notifyUser(userId: string, message: string): Promise<void>;
  updateOrderStatus(orderId: string, tenantId: string, status: string): Promise<void>;
  scheduleReminder(orderId: string, tenantId: string, delayInMinutes: number): Promise<void>;
}

// Create a proxy to the activities
const { recordCommand, notifyUser, updateOrderStatus, scheduleReminder } = proxyActivities<OrderActivities>({
  startToCloseTimeout: '1 minute',
});

/**
 * Workflow for processing an order created event
 */
export async function processOrderCreated(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, userId, scheduledFor } = cmd.payload;
  const tenantId = cmd.tenant;

  // Notify the user that their order has been received
  await notifyUser(userId, `Your order ${orderId} has been received and is pending confirmation.`);

  // Schedule a reminder for the cook to confirm the order
  await scheduleReminder(orderId, tenantId, 30); // 30 minutes

  // If the order is not confirmed within 2 hours, cancel it
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const now = Date.now();
  const scheduledTime = new Date(scheduledFor).getTime();
  const timeUntilScheduled = scheduledTime - now;

  // Wait for 2 hours or until the scheduled time, whichever is sooner
  const waitTime = Math.min(twoHoursInMs, Math.max(0, timeUntilScheduled - 2 * 60 * 60 * 1000));
  
  if (waitTime > 0) {
    // Sleep for the wait time
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Check if the order has been confirmed (this would require a query to the database)
    // For now, we'll just update the status to cancelled if it's still pending
    await updateOrderStatus(orderId, tenantId, 'cancelled');
  }
}

/**
 * Workflow for processing an order status updated event
 */
export async function processOrderStatusUpdated(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, status } = cmd.payload;
  const tenantId = cmd.tenant;

  // Handle different status updates
  switch (status) {
    case 'confirmed':
      // Notify the user that their order has been confirmed
      await notifyUser(cmd.payload.userId, `Your order ${orderId} has been confirmed.`);
      
      // Schedule a reminder for when the order should be started
      const scheduledTime = new Date(cmd.payload.scheduledFor).getTime();
      const now = Date.now();
      const timeUntilScheduled = Math.max(0, scheduledTime - now - 30 * 60 * 1000); // 30 minutes before scheduled time
      
      if (timeUntilScheduled > 0) {
        // Sleep until it's time to start cooking
        await new Promise(resolve => setTimeout(resolve, timeUntilScheduled));
        
        // Remind the cook to start cooking
        await updateOrderStatus(orderId, tenantId, 'cooking');
      }
      break;
      
    case 'cooking':
      // Notify the user that their order is being cooked
      await notifyUser(cmd.payload.userId, `Your order ${orderId} is now being cooked.`);
      
      // Schedule a reminder for when the order should be ready
      await scheduleReminder(orderId, tenantId, 20); // 20 minutes
      break;
      
    case 'ready':
      // Notify the user that their order is ready
      await notifyUser(cmd.payload.userId, `Your order ${orderId} is ready for pickup.`);
      break;
      
    case 'completed':
      // Notify the user that their order has been completed
      await notifyUser(cmd.payload.userId, `Your order ${orderId} has been completed. Thank you!`);
      break;
      
    case 'cancelled':
      // Notify the user that their order has been cancelled
      await notifyUser(cmd.payload.userId, `Your order ${orderId} has been cancelled.`);
      break;
  }
}

/**
 * Workflow for processing an order cancelled event
 */
export async function processOrderCancelled(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, reason } = cmd.payload;

  // Notify the user that their order has been cancelled
  const message = reason 
    ? `Your order ${orderId} has been cancelled. Reason: ${reason}`
    : `Your order ${orderId} has been cancelled.`;
    
  await notifyUser(cmd.payload.userId, message);
}