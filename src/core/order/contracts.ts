//core/order/contracts.ts
/**
 * Core domain contracts for commands and events
 */

// Unique identifier type
export type UUID = string;


/**
 * Domain roles for Order context
 */
export type OrderActorRole = 'customer' | 'cook' | 'system';

/**
 * Basic access context for authorization decisions
 */
export interface OrderAccessContext {
  userId: UUID;
  role: OrderActorRole;
  orderOwnerId?: UUID;
}

/**
 * List of access control conditions for Order domain
 */
export enum OrderAccessCondition {
  CAN_AUTO_ACCEPT = 'user.canAutoAcceptOrder',
  CAN_CANCEL_ORDER = 'user.canCancelOrder',
}

/**
 * Order-specific command types
 */
export enum OrderCommandType {
  CREATE_ORDER = 'createOrder',
  UPDATE_ORDER_STATUS = 'updateOrderStatus',
  CANCEL_ORDER = 'cancelOrder',
  EXECUTE_TEST = 'executeTest',
  ACCEPT_ORDER_MANUALLY = 'acceptOrderManually',
  ACCEPT_ORDER_AUTO = 'acceptOrderAuto',
  TEST_RETRYABLE = 'testRetryable',
}

/**
 * Order-specific event types
 */
export enum OrderEventType {
  ORDER_CREATED = 'orderCreated',
  ORDER_STATUS_UPDATED = 'orderStatusUpdated',
  ORDER_CANCELLED = 'orderCancelled',
  TEST_EXECUTED = 'testExecuted',
  ORDER_MANUALLY_ACCEPTED_BY_COOK = 'orderManuallyAcceptedByCook',
  ORDER_AUTO_ACCEPTED = 'orderAutoAccepted',
  TEST_RETRYABLE_EXECUTED = 'testRetryableExecuted',
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

export interface AcceptOrderManuallyPayload {
  orderId: UUID;
  userId: UUID; // Cook's user ID
}

export interface AcceptOrderAutoPayload {
  orderId: UUID;
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
 * Retryable test command payload
 */
export interface ExecuteRetryableTestPayload {
  testId: UUID;
  testName: string;
  parameters?: Record<string, any>;
}

/**
 * Order manually accepted by cook event payload
 */
export interface OrderManuallyAcceptedByCookPayload {
  orderId: UUID;
  userId: UUID; // Cook's user ID
  acceptedAt: Date;
}

/**
 * Order auto accepted event payload
 */
export interface OrderAutoAcceptedPayload {
  orderId: UUID;
  acceptedAt: Date;
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

/**
 * Retryable test executed event payload
 */
export interface RetryableTestExecutedPayload {
  testId: UUID;
  testName: string;
  result: 'success';
  executedAt: Date;
  parameters?: Record<string, any>;
}

/**
 * Order status type
 */
export type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'cancelled';

/**
 * Order item type
 */
export interface OrderItem {
  menuItemId: UUID;
  quantity: number;
  specialInstructions?: string;
}
