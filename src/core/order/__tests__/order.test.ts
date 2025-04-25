/**
 * Tests for the order domain
 */

import { OrderAggregate } from '../aggregates/order.aggregate';
import { OrderService } from '../services/order.service';
import { Command, Event } from '../../contracts';
import { OrderCommandType, OrderEventType } from '../contracts';

// Mock event store
const mockEventStore = {
  append: jest.fn().mockResolvedValue(undefined),
  load: jest.fn().mockResolvedValue([])
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
    test('should create a new order', () => {
      // Arrange
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
      
      // Act
      const aggregate = OrderAggregate.create(createOrderCommand);
      const events = aggregate.handle(createOrderCommand);
      
      // Assert
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(OrderEventType.ORDER_CREATED);
      expect(events[0].aggregateId).toBe(orderId);
      expect(events[0].tenant_id).toBe(tenantId);
      expect(events[0].payload.orderId).toBe(orderId);
      expect(events[0].payload.userId).toBe(userId);
      expect(events[0].payload.status).toBe('pending');
    });
    
    test('should update order status', () => {
      // Arrange
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
      
      // Now update the status
      const updateStatusCommand: Command = {
        id: 'cmd-456',
        tenant_id: tenantId,
        type: OrderCommandType.UPDATE_ORDER_STATUS,
        payload: {
          orderId,
          status: 'confirmed'
        }
      };
      
      // Act
      const events = aggregate.handle(updateStatusCommand);
      
      // Assert
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(OrderEventType.ORDER_STATUS_UPDATED);
      expect(events[0].aggregateId).toBe(orderId);
      expect(events[0].tenant_id).toBe(tenantId);
      expect(events[0].payload.status).toBe('confirmed');
    });
  });
  
  describe('OrderService', () => {
    test('should handle create order command', async () => {
      // Arrange
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
      
      // Act
      await orderService.handle(createOrderCommand);
      
      // Assert
      expect(mockEventStore.append).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      
      const events = mockEventStore.append.mock.calls[0][0];
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(OrderEventType.ORDER_CREATED);
    });
  });
});