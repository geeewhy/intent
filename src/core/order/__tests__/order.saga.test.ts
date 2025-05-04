/**
 * Tests for the OrderSaga
 */

import { OrderSaga } from '../sagas/order.saga';
import { Command, Event, ProcessPlan, SagaContext } from '../../contracts';
import { OrderCommandType, OrderEventType } from '../contracts';

describe('OrderSaga', () => {
  // Mock SagaContext
  const mockSagaContext: SagaContext = {
    nextId: jest.fn().mockResolvedValue('generated-id')
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GIVEN an ORDER_CREATED event', () => {
    it('WHEN handled THEN should schedule a cancel command after 2000ms', async () => {
      // GIVEN
      const orderId = 'order-123';
      const userId = 'user-456';
      const tenantId = 'tenant-789';

      const orderCreatedEvent: Event = {
        id: 'event-123',
        tenant_id: tenantId,
        type: OrderEventType.ORDER_CREATED,
        aggregateId: orderId,
        version: 1,
        payload: {
          scheduledFor: new Date(),
          orderId,
          userId,
          items: [
            { menuItemId: 'item-1', quantity: 2 }
          ],
          status: 'pending',
          createdAt: new Date()
        }
      };

      // WHEN
      const plan = await OrderSaga.react(orderCreatedEvent, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).toHaveBeenCalledTimes(1);
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toHaveLength(1);

      const delayedCommand = plan.delays![0];
      expect(delayedCommand.ms).toBe(2000);
      expect(delayedCommand.cmd.type).toBe(OrderCommandType.CANCEL_ORDER);
      expect(delayedCommand.cmd.tenant_id).toBe(tenantId);
      expect(delayedCommand.cmd.payload.orderId).toBe(orderId);
      expect(delayedCommand.cmd.payload.reason).toBe('Cook did not respond');
      expect(delayedCommand.cmd.metadata?.userId).toBe(userId);
      expect(delayedCommand.cmd.metadata?.causationId).toBe(orderCreatedEvent.id);
    });
  });

  describe('GIVEN a CREATE_ORDER command (deprecated path)', () => {
    it('WHEN handled THEN should not schedule any commands', async () => {
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
      const plan = await OrderSaga.react(createOrderCommand, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).not.toHaveBeenCalled();
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toBeUndefined();
    });
  });

  describe('GIVEN an UPDATE_ORDER_STATUS command with status "confirmed"', () => {
    it('WHEN handled THEN should schedule a status update to "cooking" after 10 minutes', async () => {
      // GIVEN
      const orderId = 'order-123';
      const userId = 'user-456';
      const tenantId = 'tenant-789';

      const updateStatusCommand: Command = {
        id: 'cmd-123',
        tenant_id: tenantId,
        type: OrderCommandType.UPDATE_ORDER_STATUS,
        payload: {
          orderId,
          status: 'confirmed'
        },
        metadata: {
          userId,
          timestamp: new Date()
        }
      };

      // WHEN
      const plan = await OrderSaga.react(updateStatusCommand, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).toHaveBeenCalledTimes(1);
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toHaveLength(1);

      const delayedCommand = plan.delays![0];
      expect(delayedCommand.ms).toBe(10 * 60 * 1000); // 10 minutes
      expect(delayedCommand.cmd.type).toBe(OrderCommandType.UPDATE_ORDER_STATUS);
      expect(delayedCommand.cmd.tenant_id).toBe(tenantId);
      expect(delayedCommand.cmd.payload.orderId).toBe(orderId);
      expect(delayedCommand.cmd.payload.status).toBe('cooking');
      expect(delayedCommand.cmd.metadata?.userId).toBe(userId);
      expect(delayedCommand.cmd.metadata?.causationId).toBe(updateStatusCommand.id);
    });
  });

  describe('GIVEN an UPDATE_ORDER_STATUS command with status other than "confirmed"', () => {
    it('WHEN handled THEN should not schedule any commands', async () => {
      // GIVEN
      const orderId = 'order-123';
      const tenantId = 'tenant-789';

      const updateStatusCommand: Command = {
        id: 'cmd-123',
        tenant_id: tenantId,
        type: OrderCommandType.UPDATE_ORDER_STATUS,
        payload: {
          orderId,
          status: 'cooking'
        }
      };

      // WHEN
      const plan = await OrderSaga.react(updateStatusCommand, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).not.toHaveBeenCalled();
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toBeUndefined();
    });
  });

  describe('GIVEN a CANCEL_ORDER command', () => {
    it('WHEN handled THEN should not schedule any commands', async () => {
      // GIVEN
      const orderId = 'order-123';
      const tenantId = 'tenant-789';

      const cancelOrderCommand: Command = {
        id: 'cmd-123',
        tenant_id: tenantId,
        type: OrderCommandType.CANCEL_ORDER,
        payload: {
          orderId,
          reason: 'Customer requested'
        }
      };

      // WHEN
      const plan = await OrderSaga.react(cancelOrderCommand, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).not.toHaveBeenCalled();
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toBeUndefined();
    });
  });

  describe('GIVEN an ORDER_MANUALLY_ACCEPTED_BY_COOK event', () => {
    it('WHEN handled THEN should schedule a reminder to start cooking after 15 minutes', async () => {
      // GIVEN
      const orderId = 'order-123';
      const userId = 'cook-456';
      const tenantId = 'tenant-789';

      const manuallyAcceptedEvent: Event = {
        id: 'event-123',
        tenant_id: tenantId,
        type: OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK,
        aggregateId: orderId,
        version: 1,
        payload: {
          orderId,
          userId
        }
      };

      // WHEN
      const plan = await OrderSaga.react(manuallyAcceptedEvent, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).toHaveBeenCalledTimes(1);
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toHaveLength(1);

      const delayedCommand = plan.delays![0];
      expect(delayedCommand.ms).toBe(15 * 60 * 1000); // 15 minutes
      expect(delayedCommand.cmd.type).toBe(OrderCommandType.UPDATE_ORDER_STATUS);
      expect(delayedCommand.cmd.tenant_id).toBe(tenantId);
      expect(delayedCommand.cmd.payload.orderId).toBe(orderId);
      expect(delayedCommand.cmd.payload.status).toBe('cooking');
      expect(delayedCommand.cmd.metadata?.userId).toBe(userId);
      expect(delayedCommand.cmd.metadata?.causationId).toBe(manuallyAcceptedEvent.id);
    });
  });

  describe('GIVEN an ORDER_AUTO_ACCEPTED event', () => {
    it('WHEN handled THEN should schedule an automatic transition to cooking status after 5 minutes', async () => {
      // GIVEN
      const orderId = 'order-123';
      const tenantId = 'tenant-789';

      const autoAcceptedEvent: Event = {
        id: 'event-123',
        tenant_id: tenantId,
        type: OrderEventType.ORDER_AUTO_ACCEPTED,
        aggregateId: orderId,
        version: 1,
        payload: {
          orderId
        }
      };

      // WHEN
      const plan = await OrderSaga.react(autoAcceptedEvent, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).toHaveBeenCalledTimes(1);
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toHaveLength(1);

      const delayedCommand = plan.delays![0];
      expect(delayedCommand.ms).toBe(5 * 60 * 1000); // 5 minutes
      expect(delayedCommand.cmd.type).toBe(OrderCommandType.UPDATE_ORDER_STATUS);
      expect(delayedCommand.cmd.tenant_id).toBe(tenantId);
      expect(delayedCommand.cmd.payload.orderId).toBe(orderId);
      expect(delayedCommand.cmd.payload.status).toBe('cooking');
      expect(delayedCommand.cmd.metadata?.causationId).toBe(autoAcceptedEvent.id);
    });
  });

  describe('GIVEN an unsupported command/event', () => {
    it('WHEN handled THEN should return an empty plan', async () => {
      // GIVEN
      const unsupportedCommand: Command = {
        id: 'cmd-123',
        tenant_id: 'tenant-789',
        type: 'unsupported.command',
        payload: {}
      };

      // WHEN
      const plan = await OrderSaga.react(unsupportedCommand, mockSagaContext);

      // THEN
      expect(mockSagaContext.nextId).not.toHaveBeenCalled();
      expect(plan.commands).toHaveLength(0);
      expect(plan.delays).toBeUndefined();
    });
  });
});
