//core/order/aggregates/order.aggregate.ts
/**
 * Order aggregate - core domain logic for orders
 */
import {
  Event,
  Command,
} from '../../contracts';

import { BusinessRuleViolation } from '../../errors';

import {
  UUID,
  OrderCommandType,
  OrderEventType,
  CreateOrderPayload,
  UpdateOrderStatusPayload,
  CancelOrderPayload,
  OrderCreatedPayload,
  OrderStatusUpdatedPayload,
  OrderCancelledPayload,
  ExecuteTestPayload,
  TestExecutedPayload,
  ExecuteRetryableTestPayload,
  RetryableTestExecutedPayload,
  AcceptOrderManuallyPayload,
  AcceptOrderAutoPayload,
  OrderManuallyAcceptedByCookPayload,
  OrderAutoAcceptedPayload,
  OrderStatus,
  OrderItem
} from '../contracts';
import { BaseAggregate } from '../../base/aggregate';
import { orderExists, orderIsPending, orderIsNotCancelled } from '../conditions/order-conditions';
import { buildEvent } from '../../utils/event-factory';

type OrderSnapshotState = {
  userId: UUID;
  items: OrderItem[];
  scheduledFor: string;
  status: OrderStatus;
  updatedAt: string;
};

/**
 * Order aggregate - represents the state and behavior of an order
 */
export class OrderAggregate extends BaseAggregate<OrderSnapshotState> {
  public aggregateType = 'order'
  userId: UUID;
  items: OrderItem[] = [];
  scheduledFor: Date;
  status: OrderStatus = 'pending';
  createdAt: Date;
  updatedAt: Date;
  cancelReason?: string;
  version: number = 0;

  /**
   * Map of command types to their handler functions
   */
  private readonly handlers: Record<OrderCommandType, (cmd: Command) => Event[]> = {
    [OrderCommandType.CREATE_ORDER]: this.handleCreateOrder.bind(this),
    [OrderCommandType.UPDATE_ORDER_STATUS]: this.handleUpdateOrderStatus.bind(this),
    [OrderCommandType.CANCEL_ORDER]: this.handleCancelOrder.bind(this),
    [OrderCommandType.EXECUTE_TEST]: this.handleExecuteTest.bind(this),
    [OrderCommandType.ACCEPT_ORDER_MANUALLY]: this.handleAcceptOrderManually.bind(this),
    [OrderCommandType.ACCEPT_ORDER_AUTO]: this.handleAcceptOrderAuto.bind(this),
    [OrderCommandType.TEST_RETRYABLE]: this.handleExecuteRetryableTest.bind(this),
  };

  /**
   * Private constructor - use static factory methods instead
   */
  public constructor(id: UUID) {
    super(id);
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.userId = '';
    this.scheduledFor = new Date();
  }

  /**
   * Create a new order aggregate from a command
   */
  public static create(cmd: Command<CreateOrderPayload>): OrderAggregate {
    return new OrderAggregate(cmd.payload.orderId);
  }

  /**
   * Rehydrate an order aggregate from its event history, supporting snapshots.
   * If a __SNAPSHOT__ event is found, uses it as the base and replays only subsequent events.
   */
  public static rehydrate(events: Event[]): OrderAggregate {
    if (!events.length) {
      throw new Error('Cannot rehydrate from empty event stream');
    }
    // Find the last __SNAPSHOT__ event, if any
    const snapshotIndex = events.map(e => e.type).lastIndexOf('__SNAPSHOT__');
    let base: OrderAggregate;
    if (snapshotIndex >= 0) {
      base = OrderAggregate.fromSnapshot(events[snapshotIndex]);
    } else {
      base = new OrderAggregate(events[0].aggregateId);
    }
    // Replay only events after the snapshot (or all if none)
    events.slice(snapshotIndex + 1).forEach(event => base.apply(event, false));
    return base;
  }


  /**
   * Handle a command and produce events
   */
  public handle(cmd: Command): Event[] {
    const handler = this.handlers[cmd.type as OrderCommandType];
    if (!handler) throw new Error(`Unknown command type: ${cmd.type}`);
    return handler(cmd);
  }

  /**
   * Apply an event to update the aggregate state
   */
  public apply(event: Event, isNew: boolean = true): void {
    switch (event.type) {
      case OrderEventType.ORDER_CREATED:
        this.applyOrderCreated(event as Event<OrderCreatedPayload>);
        break;
      case OrderEventType.ORDER_STATUS_UPDATED:
        this.applyOrderStatusUpdated(event as Event<OrderStatusUpdatedPayload>);
        break;
      case OrderEventType.ORDER_CANCELLED:
        this.applyOrderCancelled(event as Event<OrderCancelledPayload>);
        break;
      case OrderEventType.TEST_EXECUTED:
        this.applyTestExecuted(event as Event<TestExecutedPayload>);
        break;
      case OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK:
        this.applyOrderManuallyAcceptedByCook(event as Event<OrderManuallyAcceptedByCookPayload>);
        break;
      case OrderEventType.ORDER_AUTO_ACCEPTED:
        this.applyOrderAutoAccepted(event as Event<OrderAutoAcceptedPayload>);
        break;
      case OrderEventType.TEST_RETRYABLE_EXECUTED:
        this.applyRetryableTestExecuted(event as Event<RetryableTestExecutedPayload>);
        break;
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }

    // Update version if this is a new event
    if (isNew) {
      this.version++;
    } else {
      this.version = event.version;
    }
  }

  /**
   * Handle create order command
   */
  private handleCreateOrder(cmd: Command<CreateOrderPayload>): Event[] {
    // Validate command
    if (this.version > 0) {
      throw new BusinessRuleViolation('Order already exists');
    }

    if (!cmd.payload.items || cmd.payload.items.length === 0) {
      throw new BusinessRuleViolation('Order must have at least one item');
    }

    if (!cmd.payload.scheduledFor) {
      throw new BusinessRuleViolation('Order must have a scheduled time');
    }

    // Create event
    const payload = {
      orderId: cmd.payload.orderId,
      userId: cmd.payload.userId,
      items: cmd.payload.items,
      scheduledFor: cmd.payload.scheduledFor,
      status: 'pending',
      createdAt: new Date(),
    } as OrderCreatedPayload;
    const event = buildEvent<OrderCreatedPayload>(
      cmd.tenant_id,
      cmd.payload.orderId,
      OrderEventType.ORDER_CREATED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle update order status command
   */
  private handleUpdateOrderStatus(cmd: Command<UpdateOrderStatusPayload>): Event[] {
    // Validate command using registered conditions
    this.assertCondition(orderExists, 'Order does not exist');
    this.assertCondition(orderIsNotCancelled, 'Cannot update status of a cancelled order');

    if (this.status === cmd.payload.status) {
      return []; // No change, no event
    }

    // Validate status transition
    this.validateStatusTransition(cmd.payload.status);

    // Create event
    const payload = {
      orderId: cmd.payload.orderId,
      status: cmd.payload.status,
      updatedAt: new Date(),
    } as OrderStatusUpdatedPayload;
    const event = buildEvent<OrderStatusUpdatedPayload>(
      cmd.tenant_id,
      cmd.payload.orderId,
      OrderEventType.ORDER_STATUS_UPDATED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle cancel order command
   */
  private handleCancelOrder(cmd: Command<CancelOrderPayload>): Event[] {
    // Validate command using registered conditions
    this.assertCondition(orderExists, 'Order does not exist');

    // Already cancelled?
    if (!orderIsNotCancelled(this)) {
      return []; // No-op if already cancelled
    }

    // Cannot cancel after completion
    if (this.status === 'completed') {
      throw new BusinessRuleViolation('Cannot cancel a completed order');
    }

    // Create event
    const payload = {
      orderId: cmd.payload.orderId,
      reason: cmd.payload.reason,
      cancelledAt: new Date(),
    } as OrderCancelledPayload;
    const event = buildEvent<OrderCancelledPayload>(
      cmd.tenant_id,
      cmd.payload.orderId,
      OrderEventType.ORDER_CANCELLED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Apply order created event
   */
  private applyOrderCreated(event: Event<OrderCreatedPayload>): void {
    this.id = event.payload.orderId;
    this.userId = event.payload.userId;
    this.items = [...event.payload.items];
    this.scheduledFor = new Date(event.payload.scheduledFor);
    this.status = event.payload.status;
    this.createdAt = new Date(event.payload.createdAt);
    this.updatedAt = new Date(event.payload.createdAt);
  }

  /**
   * Apply order status updated event
   */
  private applyOrderStatusUpdated(event: Event<OrderStatusUpdatedPayload>): void {
    this.status = event.payload.status;
    this.updatedAt = new Date(event.payload.updatedAt);
  }

  /**
   * Apply order cancelled event
   */
  private applyOrderCancelled(event: Event<OrderCancelledPayload>): void {
    this.status = 'cancelled';
    this.cancelReason = event.payload.reason;
    this.updatedAt = new Date(event.payload.cancelledAt);
  }

  /**
   * Apply test executed event
   */
  private applyTestExecuted(event: Event<TestExecutedPayload>): void {
    // For test events, we don't need to update the aggregate state
    // This is just a placeholder to handle the event
    this.updatedAt = new Date(event.payload.executedAt);
  }

  /**
   * Apply order manually accepted by cook event
   */
  private applyOrderManuallyAcceptedByCook(event: Event<OrderManuallyAcceptedByCookPayload>): void {
    // Update the order status to be confirmed when a cook accepts it
    this.status = 'confirmed';
    this.updatedAt = new Date(event.payload.acceptedAt);
  }

  /**
   * Apply order auto accepted event
   */
  private applyOrderAutoAccepted(event: Event<OrderAutoAcceptedPayload>): void {
    // Update the order status to be confirmed when it's auto-accepted
    this.status = 'confirmed';
    this.updatedAt = new Date(event.payload.acceptedAt);
  }
  /**
   * Apply retryable test executed event
   */
  private applyRetryableTestExecuted(event: Event<RetryableTestExecutedPayload>): void {
    this.updatedAt = new Date(event.payload.executedAt);
  }

  /**
   * Handle execute test command
   */
  private handleExecuteTest(cmd: Command<ExecuteTestPayload>): Event[] {
    // Create event
    const aggregateId = this.id || cmd.payload.testId;
    const payload = {
      testId: cmd.payload.testId,
      testName: cmd.payload.testName,
      result: 'success',
      message: 'Test executed successfully',
      executedAt: new Date(),
      parameters: cmd.payload.parameters,
    } as TestExecutedPayload;
    const event = buildEvent<TestExecutedPayload>(
      cmd.tenant_id,
      aggregateId,
      OrderEventType.TEST_EXECUTED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle retryable test command
   */
  private handleExecuteRetryableTest(cmd: Command<ExecuteRetryableTestPayload>): Event[] {
    // Fail on even versions (including initial version 0) to simulate retryable error
    if (this.version % 2 === 0) {
      throw new BusinessRuleViolation('Transient retryable error', undefined, true);
    }
    const aggregateId = this.id || cmd.payload.testId;
    const now = new Date();
    const payload = {
      testId: cmd.payload.testId,
      testName: cmd.payload.testName,
      result: 'success',
      executedAt: now,
      parameters: cmd.payload.parameters,
    } as RetryableTestExecutedPayload;
    const event = buildEvent<RetryableTestExecutedPayload>(
      cmd.tenant_id,
      aggregateId,
      OrderEventType.TEST_RETRYABLE_EXECUTED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );
    this.apply(event);
    return [event];
  }

  /**
   * Handle accept order manually command
   */
  private handleAcceptOrderManually(cmd: Command<AcceptOrderManuallyPayload>): Event[] {
    // Validate command using registered conditions
    this.assertCondition(orderExists, 'Order does not exist');
    this.assertCondition(orderIsPending, 'Only pending orders can be accepted');

    // Create event
    const payload = {
      orderId: cmd.payload.orderId,
      userId: cmd.payload.userId,
      acceptedAt: new Date(),
    } as OrderManuallyAcceptedByCookPayload;
    const event = buildEvent<OrderManuallyAcceptedByCookPayload>(
      cmd.tenant_id,
      cmd.payload.orderId,
      OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle accept order auto command
   */
  private handleAcceptOrderAuto(cmd: Command<AcceptOrderAutoPayload>): Event[] {
    // Validate command using registered conditions
    this.assertCondition(orderExists, 'Order does not exist');
    this.assertCondition(orderIsPending, 'Only pending orders can be accepted');

    // Create event
    const payload = {
      orderId: cmd.payload.orderId,
      acceptedAt: new Date(),
    } as OrderAutoAcceptedPayload;
    const event = buildEvent<OrderAutoAcceptedPayload>(
      cmd.tenant_id,
      cmd.payload.orderId,
      OrderEventType.ORDER_AUTO_ACCEPTED,
      this.version + 1,
      payload,
      {
        userId: cmd.metadata?.userId,
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id,
      }
    );

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['cooking', 'cancelled'],
      'cooking': ['ready', 'cancelled'],
      'ready': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    const allowed = validTransitions[this.status];
    if (!allowed) {
      throw new Error(`Unhandled order status: ${this.status}`);
    }
    if (!allowed.includes(newStatus)) {
      throw new BusinessRuleViolation(
        `Invalid status transition from ${this.status} to ${newStatus}`
      );
    }
  }

  /**
   * Assert a registered condition on this order or throw a BusinessRuleViolation
   */
  private assertCondition(condition: (order: OrderAggregate) => boolean, message: string): void {
    if (!condition(this)) {
      throw new BusinessRuleViolation(message);
    }
  }

  applySnapshotState(state: OrderSnapshotState): void {
    Object.assign(this, {
      userId: state.userId,
      items: state.items,
      scheduledFor: new Date(state.scheduledFor),
      status: state.status,
      updatedAt: new Date(state.updatedAt),
    });
  }

  extractSnapshotState(): OrderSnapshotState {
    return {
      userId: this.userId,
      items: this.items,
      scheduledFor: this.scheduledFor.toISOString(),
      status: this.status,
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  // Getters
  public getId(): UUID {
    return this.id;
  }

  public getStatus(): OrderStatus {
    return this.status;
  }

  public getVersion(): number {
    return this.version;
  }
}