/**
 * Core domain contracts for commands and events
 */

// Unique identifier type
export type UUID = string;

/**
 * Order-specific command types
 */
export enum OrderCommandType {
  CREATE_ORDER = 'createOrder',
  UPDATE_ORDER_STATUS = 'updateOrderStatus',
  CANCEL_ORDER = 'cancelOrder',
}

/**
 * Order-specific event types
 */
export enum OrderEventType {
  ORDER_CREATED = 'orderCreated',
  ORDER_STATUS_UPDATED = 'orderStatusUpdated',
  ORDER_CANCELLED = 'orderCancelled',
  TEST_EXECUTED = 'testExecuted',
}

/**
 * Order command payloads
 */
export interface CreateOrderPayload {
  orderId: UUID;
  userId: UUID;
  items: {
    menuItemId: UUID;
    quantity: number;
    specialInstructions?: string;
  }[];
  scheduledFor: Date;
}

export interface UpdateOrderStatusPayload {
  orderId: UUID;
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'cancelled';
}

export interface CancelOrderPayload {
  orderId: UUID;
  reason?: string;
}

/**
 * Order event payloads
 */
export interface OrderCreatedPayload {
  orderId: UUID;
  userId: UUID;
  items: {
    menuItemId: UUID;
    quantity: number;
    specialInstructions?: string;
  }[];
  scheduledFor: Date;
  status: 'pending';
  createdAt: Date;
}

export interface OrderStatusUpdatedPayload {
  orderId: UUID;
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  updatedAt: Date;
}

export interface OrderCancelledPayload {
  orderId: UUID;
  reason?: string;
  cancelledAt: Date;
}

/**
 * Test command payload
 */
export interface ExecuteTestPayload {
  testId: UUID;
  testName: string;
  parameters?: Record<string, any>;
}

/**
 * Test event payload
 */
export interface TestExecutedPayload {
  testId: UUID;
  testName: string;
  result: 'success' | 'failure';
  message?: string;
  executedAt: Date;
  parameters?: Record<string, any>;
}
