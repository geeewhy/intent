/**
 * Tests for the order domain
 */

import { OrderAggregate } from '../aggregates/order.aggregate';
import { OrderService } from '../services/order.service';
import { Command, Event } from '../../contracts';
import { OrderCommandType, OrderEventType } from '../contracts';
import { BusinessRuleViolation } from '../../errors';

// Mock event store
const mockEventStore = {
  append: jest.fn().mockResolvedValue(undefined),
  load: jest.fn().mockResolvedValue({ events: [], version: 0 }),
  loadSnapshot: jest.fn().mockResolvedValue(null)
};

// Mock event publisher
const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined)
};

describe('Order Domain', () => {
  let orderService: OrderService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create order service with mocks
    orderService = new OrderService(mockEventStore, mockEventPublisher);
  });

  describe('OrderAggregate', () => {
    describe('GIVEN a create order command', () => {
      it('WHEN handled THEN should produce order created event and update aggregate state', () => {
        // GIVEN
        const orderId = 'order-123';
        const userId = 'user-456';
        const tenantId = 'tenant-789';

        const createOrderCommand: Command = {
          id: 'cmd-123',
          tenant_id: tenantId,
          type: OrderCommandType.CREATE_ORDER,
          payload: {
            orderId,
            userId,
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date()
          }
        };

        // WHEN
        const aggregate = OrderAggregate.create(createOrderCommand);
        const events = aggregate.handle(createOrderCommand);

        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.ORDER_CREATED);
        expect(events[0].aggregateId).toBe(orderId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.orderId).toBe(orderId);
        expect(events[0].payload.userId).toBe(userId);
        expect(events[0].payload.status).toBe('pending');

        // Verify aggregate state
        expect(aggregate.getId()).toBe(orderId);
        expect(aggregate.getStatus()).toBe('pending');
        expect(aggregate.getVersion()).toBe(1);
      });
    });
    describe('GIVEN a retryable test command', () => {
      it('WHEN version is even THEN should throw a retryable BusinessRuleViolation', () => {
        // GIVEN
        const testId = 'retry-test-123';
        const tenantId = 'tenant-789';
        const aggregate = OrderAggregate.create({ payload: { orderId: testId } } as any);
        const retryableCmd: Command = {
          id: 'cmd-retry-fail',
          tenant_id: tenantId,
          type: OrderCommandType.TEST_RETRYABLE,
          payload: { testId, testName: 'Retry Test', parameters: {} },
        };
        expect(() => aggregate.handle(retryableCmd)).toThrow(BusinessRuleViolation);
      });

      it('WHEN version is odd THEN should produce testRetryableExecuted event and update aggregate state', () => {
        // GIVEN
        const testId = 'retry-test-456';
        const tenantId = 'tenant-789';
        const aggregate = OrderAggregate.create({ payload: { orderId: testId } } as any);
        // bump version to 1
        const baselineCmd: Command = {
          id: 'cmd-baseline',
          tenant_id: tenantId,
          type: OrderCommandType.EXECUTE_TEST,
          payload: { testId, testName: 'Baseline Test', parameters: {} },
        };
        aggregate.handle(baselineCmd);
        expect(aggregate.getVersion()).toBe(1);

        const retryableCmd: Command = {
          id: 'cmd-retry-success',
          tenant_id: tenantId,
          type: OrderCommandType.TEST_RETRYABLE,
          payload: { testId, testName: 'Retry Test', parameters: { foo: 'bar' } },
        };
        // WHEN
        const events = aggregate.handle(retryableCmd);
        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.TEST_RETRYABLE_EXECUTED);
        expect(events[0].aggregateId).toBe(testId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.testId).toBe(testId);
        expect(events[0].payload.testName).toBe('Retry Test');
        expect(aggregate.getVersion()).toBe(2);
      });
    });

    describe('GIVEN an existing order and an update status command', () => {
      it('WHEN handled THEN should produce status updated event and update aggregate state', () => {
        // GIVEN
        const orderId = 'order-123';
        const tenantId = 'tenant-789';

        // Create an order first
        const createOrderCommand: Command = {
          id: 'cmd-123',
          tenant_id: tenantId,
          type: OrderCommandType.CREATE_ORDER,
          payload: {
            orderId,
            userId: 'user-456',
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date()
          }
        };

        const aggregate = OrderAggregate.create(createOrderCommand);
        aggregate.handle(createOrderCommand);

        // Initial state verification
        expect(aggregate.getStatus()).toBe('pending');
        expect(aggregate.getVersion()).toBe(1);

        // Update status command
        const updateStatusCommand: Command = {
          id: 'cmd-456',
          tenant_id: tenantId,
          type: OrderCommandType.UPDATE_ORDER_STATUS,
          payload: {
            orderId,
            status: 'confirmed'
          }
        };

        // WHEN
        const events = aggregate.handle(updateStatusCommand);

        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.ORDER_STATUS_UPDATED);
        expect(events[0].aggregateId).toBe(orderId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.status).toBe('confirmed');

        // Verify aggregate state
        expect(aggregate.getStatus()).toBe('confirmed');
        expect(aggregate.getVersion()).toBe(2);
      });
    });

    describe('GIVEN a test command', () => {
      it('WHEN handled THEN should produce test executed event and update aggregate state', () => {
        // GIVEN
        const testId = 'test-123';
        const tenantId = 'tenant-789';

        const executeTestCommand: Command = {
          id: 'cmd-789',
          tenant_id: tenantId,
          type: OrderCommandType.EXECUTE_TEST,
          payload: {
            testId,
            testName: 'Test Command',
            parameters: { param1: 'value1' }
          }
        };

        // WHEN
        const aggregate = OrderAggregate.create({ payload: { orderId: testId } } as any);

        // Initial state verification
        expect(aggregate.getId()).toBe(testId);
        expect(aggregate.getVersion()).toBe(0);

        const events = aggregate.handle(executeTestCommand);

        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.TEST_EXECUTED);
        expect(events[0].aggregateId).toBe(testId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.testId).toBe(testId);
        expect(events[0].payload.testName).toBe('Test Command');
        expect(events[0].payload.result).toBe('success');

        // Verify aggregate state
        expect(aggregate.getVersion()).toBe(1);
      });
    });

    describe('GIVEN an existing order and a manual accept command', () => {
      it('WHEN handled THEN should produce order manually accepted event and update aggregate state', () => {
        // GIVEN
        const orderId = 'order-123';
        const userId = 'cook-456';
        const tenantId = 'tenant-789';

        // Create an order first
        const createOrderCommand: Command = {
          id: 'cmd-123',
          tenant_id: tenantId,
          type: OrderCommandType.CREATE_ORDER,
          payload: {
            orderId,
            userId: 'user-456',
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date()
          }
        };

        const aggregate = OrderAggregate.create(createOrderCommand);
        aggregate.handle(createOrderCommand);

        // Initial state verification
        expect(aggregate.getStatus()).toBe('pending');
        expect(aggregate.getVersion()).toBe(1);

        // Manual accept command
        const acceptOrderCommand: Command = {
          id: 'cmd-456',
          tenant_id: tenantId,
          type: OrderCommandType.ACCEPT_ORDER_MANUALLY,
          payload: {
            orderId,
            userId
          }
        };

        // WHEN
        const events = aggregate.handle(acceptOrderCommand);

        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK);
        expect(events[0].aggregateId).toBe(orderId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.orderId).toBe(orderId);
        expect(events[0].payload.userId).toBe(userId);

        // Verify aggregate state
        expect(aggregate.getStatus()).toBe('confirmed');
      });
    });

    describe('GIVEN an existing order and an auto accept command', () => {
      it('WHEN handled THEN should produce order auto accepted event and update aggregate state', () => {
        // GIVEN
        const orderId = 'order-123';
        const tenantId = 'tenant-789';

        // Create an order first
        const createOrderCommand: Command = {
          id: 'cmd-123',
          tenant_id: tenantId,
          type: OrderCommandType.CREATE_ORDER,
          payload: {
            orderId,
            userId: 'user-456',
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date()
          }
        };

        const aggregate = OrderAggregate.create(createOrderCommand);
        aggregate.handle(createOrderCommand);

        // Initial state verification
        expect(aggregate.getStatus()).toBe('pending');
        expect(aggregate.getVersion()).toBe(1);

        // Auto accept command
        const acceptOrderCommand: Command = {
          id: 'cmd-456',
          tenant_id: tenantId,
          type: OrderCommandType.ACCEPT_ORDER_AUTO,
          payload: {
            orderId
          }
        };

        // WHEN
        const events = aggregate.handle(acceptOrderCommand);

        // THEN
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.ORDER_AUTO_ACCEPTED);
        expect(events[0].aggregateId).toBe(orderId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.orderId).toBe(orderId);

        // Verify aggregate state
        expect(aggregate.getStatus()).toBe('confirmed');
        expect(aggregate.getVersion()).toBe(2);
      });
    });
  });

  describe('OrderService', () => {
    describe('GIVEN a create order command', () => {
      it('WHEN handled THEN should store and publish order created event', async () => {
        // GIVEN
        const orderId = 'order-123';
        const userId = 'user-456';
        const tenantId = 'tenant-789';

        const createOrderCommand: Command = {
          id: 'cmd-123',
          tenant_id: tenantId,
          type: OrderCommandType.CREATE_ORDER,
          payload: {
            orderId,
            userId,
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date()
          }
        };

        // WHEN
        await orderService.handle(createOrderCommand);

        // THEN
        expect(mockEventStore.append).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);

        // Check that append was called with the correct arguments
        expect(mockEventStore.append.mock.calls[0][0]).toBe(tenantId); // tenantId
        expect(mockEventStore.append.mock.calls[0][1]).toBe('order'); // aggregateType
        expect(mockEventStore.append.mock.calls[0][2]).toBe(orderId); // aggregateId

        const events = mockEventStore.append.mock.calls[0][3]; // events array is now the 4th argument
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.ORDER_CREATED);
        expect(events[0].aggregateId).toBe(orderId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.orderId).toBe(orderId);
        expect(events[0].payload.userId).toBe(userId);
        expect(events[0].payload.status).toBe('pending');
      });
    });

    describe('GIVEN an execute test command', () => {
      it('WHEN handled THEN should store and publish test executed event', async () => {
        // GIVEN
        const testId = 'test-123';
        const tenantId = 'tenant-789';

        const executeTestCommand: Command = {
          id: 'cmd-789',
          tenant_id: tenantId,
          type: OrderCommandType.EXECUTE_TEST,
          payload: {
            testId,
            testName: 'Test Command',
            parameters: { param1: 'value1' }
          }
        };

        // WHEN
        await orderService.handle(executeTestCommand);

        // THEN
        expect(mockEventStore.append).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);

        // Check that append was called with the correct arguments
        expect(mockEventStore.append.mock.calls[0][0]).toBe(tenantId); // tenantId
        expect(mockEventStore.append.mock.calls[0][1]).toBe('order'); // aggregateType
        expect(mockEventStore.append.mock.calls[0][2]).toBe(testId); // aggregateId

        const events = mockEventStore.append.mock.calls[0][3]; // events array is now the 4th argument
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe(OrderEventType.TEST_EXECUTED);
        expect(events[0].aggregateId).toBe(testId);
        expect(events[0].tenant_id).toBe(tenantId);
        expect(events[0].payload.testId).toBe(testId);
        expect(events[0].payload.testName).toBe('Test Command');
        expect(events[0].payload.result).toBe('success');
      });
    });

    describe('GIVEN an incoming event', () => {
      it('WHEN handled THEN should apply event and publish it', async () => {
        // GIVEN
        const orderId = 'order-123';
        const tenantId = 'tenant-789';

        const event: Event = {
          id: 'event-123',
          tenant_id: tenantId,
          type: OrderEventType.ORDER_CREATED,
          aggregateId: orderId,
          version: 1,
          payload: {
            orderId,
            userId: 'user-456',
            items: [
              { menuItemId: 'item-1', quantity: 2 }
            ],
            scheduledFor: new Date(),
            status: 'pending',
            createdAt: new Date()
          }
        };

        // WHEN
        await orderService.on(event);

        // THEN
        expect(mockEventStore.load).toHaveBeenCalledWith(tenantId, 'order', orderId);
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.publish).toHaveBeenCalledWith([event]);
      });
    });

    describe('GIVEN a need for an event handler', () => {
      it('WHEN created THEN should return a valid event handler that supports order events', () => {
        // GIVEN
        // OrderService is already created in beforeEach

        // WHEN
        const eventHandler = orderService;

        // THEN
        expect(eventHandler).toBeDefined();
        expect(typeof eventHandler.supportsEvent).toBe('function');
        expect(typeof eventHandler.handle).toBe('function');

        // Verify it supports order events
        const orderEvent: Event = {
          id: 'event-123',
          tenant_id: 'tenant-789',
          type: 'order.orderCreated',
          aggregateId: 'order-123',
          version: 1,
          payload: {} as any
        };
        expect(eventHandler.supportsEvent(orderEvent)).toBe(true);

        // Verify it doesn't support non-order events
        const nonOrderEvent: Event = {
          id: 'event-456',
          tenant_id: 'tenant-789',
          type: 'user.userCreated',
          aggregateId: 'user-123',
          version: 1,
          payload: {} as any
        };
        expect(eventHandler.supportsEvent(nonOrderEvent)).toBe(false);
      });
    });
  });
});
