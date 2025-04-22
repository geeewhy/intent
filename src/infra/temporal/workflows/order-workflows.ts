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
  markCommandAsProcessed(commandId: string, tenantId: string): Promise<void>;
}

// Create a proxy to the activities
const { recordCommand, notifyUser, updateOrderStatus: updateOrderStatusActivity, scheduleReminder, markCommandAsProcessed } = proxyActivities<OrderActivities>({
  startToCloseTimeout: '1 minute',
});

/**
 * Workflow for creating an order (matches the command type 'createOrder')
 */
export async function createOrder(cmd: Command): Promise<void> {
  return processOrderCreated(cmd);
}

/**
 * Workflow for processing an order created event
 */
export async function processOrderCreated(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, userId, scheduledFor } = cmd.payload;
  const tenantId = cmd.tenant_id;

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
    await updateOrderStatusActivity(orderId, tenantId, 'cancelled');
  }

  // Mark the command as processed (workflow successfully finished)
  await markCommandAsProcessed(cmd.id, tenantId);
}

/**
 * Workflow for updating order status (matches the command type 'updateOrderStatus')
 */
export async function updateOrderStatus(cmd: Command): Promise<void> {
  return processOrderStatusUpdated(cmd);
}

/**
 * Workflow for processing an order status updated event
 */
export async function processOrderStatusUpdated(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, status } = cmd.payload;
  const tenantId = cmd.tenant_id;

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
        await updateOrderStatusActivity(orderId, tenantId, 'cooking');
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

  // Mark the command as processed (workflow successfully finished)
  await markCommandAsProcessed(cmd.id, tenantId);
}

/**
 * Workflow for cancelling an order (matches the command type 'cancelOrder')
 */
export async function cancelOrder(cmd: Command): Promise<void> {
  return processOrderCancelled(cmd);
}

/**
 * Workflow for processing an order cancelled event
 */
export async function processOrderCancelled(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { orderId, reason } = cmd.payload;
  const tenantId = cmd.tenant_id;

  // Notify the user that their order has been cancelled
  const message = reason 
    ? `Your order ${orderId} has been cancelled. Reason: ${reason}`
    : `Your order ${orderId} has been cancelled.`;

  await notifyUser(cmd.payload.userId, message);

  // Mark the command as processed (workflow successfully finished)
  await markCommandAsProcessed(cmd.id, tenantId);
}

/**
 * Workflow for executing a test (matches the command type 'executeTest')
 */
export async function executeTest(cmd: Command): Promise<void> {
  // Record the command in the database
  await recordCommand(cmd);

  // Extract data from the command
  const { testId, testName, parameters } = cmd.payload;
  const tenantId = cmd.tenant_id;

  console.log(`Executing test: ${testName} (${testId})`, parameters);

  // In a real implementation, we would execute the test here
  // For now, we'll just log the test execution

  // Mark the command as processed (workflow successfully finished)
  await markCommandAsProcessed(cmd.id, tenantId);
}
