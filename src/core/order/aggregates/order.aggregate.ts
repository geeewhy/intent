//core/order/aggregates/order.aggregate.ts
/**
 * Order aggregate - core domain logic for orders
 */

import {
  Event,
  Command,
} from '../../contracts';

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
  AcceptOrderManuallyPayload,
  AcceptOrderAutoPayload,
  OrderManuallyAcceptedByCookPayload,
  OrderAutoAcceptedPayload,
  OrderStatus,
  OrderItem
} from '../contracts';

/**
 * Order aggregate - represents the state and behavior of an order
 */
export class OrderAggregate {
  private id: UUID;
  private userId: UUID;
  private items: OrderItem[] = [];
  private scheduledFor: Date;
  private status: OrderStatus = 'pending';
  private createdAt: Date;
  private updatedAt: Date;
  private cancelReason?: string;
  private version: number = 0;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(id: UUID) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.userId = '';
    this.scheduledFor = new Date();
  }

  /**
   * Create a new order aggregate from a command
   */
  public static create(cmd: Command<CreateOrderPayload>): OrderAggregate {
    const order = new OrderAggregate(cmd.payload.orderId);
    return order;
  }

  /**
   * Rehydrate an order aggregate from its event history
   */
  public static rehydrate(events: Event[]): OrderAggregate {
    if (!events.length) {
      throw new Error('Cannot rehydrate from empty event stream');
    }

    // Create a new aggregate with the ID from the first event
    const order = new OrderAggregate(events[0].aggregateId);

    // Apply all events to build the current state
    events.forEach(event => order.apply(event, false));

    return order;
  }

  /**
   * Handle a command and produce events
   */
  public handle(cmd: Command): Event[] {
    switch (cmd.type) {
      case OrderCommandType.CREATE_ORDER:
        return this.handleCreateOrder(cmd as Command<CreateOrderPayload>);
      case OrderCommandType.UPDATE_ORDER_STATUS:
        return this.handleUpdateOrderStatus(cmd as Command<UpdateOrderStatusPayload>);
      case OrderCommandType.CANCEL_ORDER:
        return this.handleCancelOrder(cmd as Command<CancelOrderPayload>);
      case OrderCommandType.EXECUTE_TEST:
        return this.handleExecuteTest(cmd as Command<ExecuteTestPayload>);
      case OrderCommandType.ACCEPT_ORDER_MANUALLY:
        return this.handleAcceptOrderManually(cmd as Command<AcceptOrderManuallyPayload>);
      case OrderCommandType.ACCEPT_ORDER_AUTO:
        return this.handleAcceptOrderAuto(cmd as Command<AcceptOrderAutoPayload>);
      default:
        throw new Error(`Unknown command type: ${cmd.type}`);
    }
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
      throw new Error('Order already exists');
    }

    if (!cmd.payload.items || cmd.payload.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    if (!cmd.payload.scheduledFor) {
      throw new Error('Order must have a scheduled time');
    }

    // Create event
    const event: Event<OrderCreatedPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.ORDER_CREATED,
      aggregateId: cmd.payload.orderId,
      version: this.version + 1,
      payload: {
        orderId: cmd.payload.orderId,
        userId: cmd.payload.userId,
        items: cmd.payload.items,
        scheduledFor: cmd.payload.scheduledFor,
        status: 'pending',
        createdAt: new Date()
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle update order status command
   */
  private handleUpdateOrderStatus(cmd: Command<UpdateOrderStatusPayload>): Event[] {
    // Validate command
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status === 'cancelled') {
      throw new Error('Cannot update status of a cancelled order');
    }

    if (this.status === cmd.payload.status) {
      return []; // No change, no event
    }

    // Validate status transition
    this.validateStatusTransition(cmd.payload.status);

    // Create event
    const event: Event<OrderStatusUpdatedPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.ORDER_STATUS_UPDATED,
      aggregateId: cmd.payload.orderId,
      version: this.version + 1,
      payload: {
        orderId: cmd.payload.orderId,
        status: cmd.payload.status,
        updatedAt: new Date()
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle cancel order command
   */
  private handleCancelOrder(cmd: Command<CancelOrderPayload>): Event[] {
    // Validate command
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status === 'cancelled') {
      return []; // Already cancelled, no event
    }

    if (this.status === 'completed') {
      throw new Error('Cannot cancel a completed order');
    }

    // Create event
    const event: Event<OrderCancelledPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.ORDER_CANCELLED,
      aggregateId: cmd.payload.orderId,
      version: this.version + 1,
      payload: {
        orderId: cmd.payload.orderId,
        reason: cmd.payload.reason,
        cancelledAt: new Date()
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

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
    // Update the order status to confirmed when a cook accepts it
    this.status = 'confirmed';
    this.updatedAt = new Date(event.payload.acceptedAt);
  }

  /**
   * Apply order auto accepted event
   */
  private applyOrderAutoAccepted(event: Event<OrderAutoAcceptedPayload>): void {
    // Update the order status to confirmed when it's auto-accepted
    this.status = 'confirmed';
    this.updatedAt = new Date(event.payload.acceptedAt);
  }

  /**
   * Handle execute test command
   */
  private handleExecuteTest(cmd: Command<ExecuteTestPayload>): Event[] {
    // Create event
    const event: Event<TestExecutedPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.TEST_EXECUTED,
      aggregateId: this.id || cmd.payload.testId,
      version: this.version + 1,
      payload: {
        testId: cmd.payload.testId,
        testName: cmd.payload.testName,
        result: 'success',
        message: 'Test executed successfully',
        executedAt: new Date(),
        parameters: cmd.payload.parameters
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle accept order manually command
   */
  private handleAcceptOrderManually(cmd: Command<AcceptOrderManuallyPayload>): Event[] {
    // Validate command
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status !== 'pending') {
      throw new Error('Only pending orders can be accepted');
    }

    // Create event
    const event: Event<OrderManuallyAcceptedByCookPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK,
      aggregateId: cmd.payload.orderId,
      version: this.version + 1,
      payload: {
        orderId: cmd.payload.orderId,
        userId: cmd.payload.userId,
        acceptedAt: new Date()
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

    // Apply the event to update the aggregate state
    this.apply(event);

    return [event];
  }

  /**
   * Handle accept order auto command
   */
  private handleAcceptOrderAuto(cmd: Command<AcceptOrderAutoPayload>): Event[] {
    // Validate command
    if (this.version === 0) {
      throw new Error('Order does not exist');
    }

    if (this.status !== 'pending') {
      throw new Error('Only pending orders can be accepted');
    }

    // Create event
    const event: Event<OrderAutoAcceptedPayload> = {
      id: crypto.randomUUID(),
      tenant_id: cmd.tenant_id,
      type: OrderEventType.ORDER_AUTO_ACCEPTED,
      aggregateId: cmd.payload.orderId,
      version: this.version + 1,
      payload: {
        orderId: cmd.payload.orderId,
        acceptedAt: new Date()
      },
      metadata: {
        userId: cmd.metadata?.userId,
        timestamp: new Date(),
        correlationId: cmd.metadata?.correlationId,
        causationId: cmd.id
      }
    };

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

    if (!validTransitions[this.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }
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
