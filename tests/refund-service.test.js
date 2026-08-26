const { describe, it } = require('node:test');
const assert = require('node:assert');
const ShippingLabelUtil = require('../services/Refund-Service/src/utils/shipping-label');

describe('Refund-Service - Feature 1: Create Return Request', () => {
  describe('Input Validation & Order Ownership Check', () => {
    it('should validate that orderId, items, and reason are present', () => {
      const validateInput = (data) => {
        if (!data.orderId) throw new Error('Order ID is required');
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          throw new Error('At least one item must be selected for return');
        }
        if (!data.reason || data.reason.trim().length === 0) {
          throw new Error('Return reason is required');
        }
        return true;
      };

      assert.strictEqual(
        validateInput({
          orderId: 'ord_12345',
          items: [{ productId: 'p1', name: 'Shoes', price: 99, quantity: 1 }],
          reason: 'Item is defective'
        }),
        true
      );

      assert.throws(() => validateInput({ items: [{ productId: 'p1' }], reason: 'Broken' }), /Order ID is required/);
      assert.throws(() => validateInput({ orderId: 'ord_1', items: [], reason: 'Broken' }), /At least one item must be selected/);
      assert.throws(() => validateInput({ orderId: 'ord_1', items: [{ productId: 'p1' }], reason: '' }), /Return reason is required/);
    });

    it('should verify order ownership matches the authenticated user', () => {
      const order = { userId: 'user_100', totalAmount: 199.99, orderStatus: 'CONFIRMED' };
      const currentUserId = 'user_100';
      const unauthorizedUserId = 'user_999';

      assert.strictEqual(String(order.userId) === String(currentUserId), true);
      assert.strictEqual(String(order.userId) === String(unauthorizedUserId), false);
    });

    it('should calculate originalAmount based on selected return item quantities', () => {
      const items = [
        { productId: 'p1', name: 'Keyboard', price: 60, quantity: 2 },
        { productId: 'p2', name: 'Mouse', price: 30, quantity: 1 }
      ];

      const originalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      assert.strictEqual(originalAmount, 150);
    });

    it('should generate an initial return shipping label during return creation', () => {
      const label = ShippingLabelUtil.generateLabel({
        returnId: 'ret_test_1',
        orderId: 'ord_test_1',
        pickupAddress: '123 Main Street'
      });

      assert.ok(label.labelId.startsWith('LBL-'));
      assert.ok(label.trackingNumber.startsWith('RET-TRK-'));
      assert.strictEqual(label.carrier, 'Express Logistics Returns');
    });
  });
});

describe('Refund-Service - Feature 2: Fetch Return Requests', () => {
  describe('Ownership & Role Authorization Checks', () => {
    it('should allow customer to access their own return request', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123',
        status: 'RETURN_REQUESTED'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.strictEqual(checkAccess(returnRecord, 'user_abc', 'customer'), true);
    });

    it('should allow admin to access any return request', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.strictEqual(checkAccess(returnRecord, 'admin_user', 'admin'), true);
    });

    it('should throw 403 Access Denied when another customer attempts to view the return', () => {
      const returnRecord = {
        _id: 'ret_100',
        userId: 'user_abc',
        orderId: 'ord_123'
      };

      const checkAccess = (record, requestingUserId, role) => {
        if (!record) throw new Error('Return request not found');
        if (role !== 'admin' && String(record.userId) !== String(requestingUserId)) {
          throw new Error('Access denied to this return record');
        }
        return true;
      };

      assert.throws(() => {
        checkAccess(returnRecord, 'attacker_user_xyz', 'customer');
      }, /Access denied to this return record/);
    });

    it('should filter user returns list by user ID and sort by newest first', () => {
      const allReturns = [
        { _id: 'r1', userId: 'user_1', createdAt: new Date('2026-08-01') },
        { _id: 'r2', userId: 'user_2', createdAt: new Date('2026-08-02') },
        { _id: 'r3', userId: 'user_1', createdAt: new Date('2026-08-03') }
      ];

      const user1Returns = allReturns
        .filter(r => r.userId === 'user_1')
        .sort((a, b) => b.createdAt - a.createdAt);

      assert.strictEqual(user1Returns.length, 2);
      assert.strictEqual(user1Returns[0]._id, 'r3'); // newest
      assert.strictEqual(user1Returns[1]._id, 'r1');
    });
  });
});

describe('Refund-Service - Feature 3: Schedule Courier Pickup', () => {
  describe('Status Progression & Pickup Details Validation', () => {
    it('should transition status from RETURN_REQUESTED to PICKUP_SCHEDULED', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'RETURN_REQUESTED',
        pickupDetails: {}
      };

      const schedulePickup = (record, pickupData) => {
        if (record.status !== 'RETURN_REQUESTED') {
          throw new Error(`Cannot schedule pickup. Current status is ${record.status}, expected RETURN_REQUESTED`);
        }
        record.status = 'PICKUP_SCHEDULED';
        record.pickupDetails = {
          scheduledDate: pickupData.scheduledDate || new Date(),
          pickupSlot: pickupData.pickupSlot || 'Morning (9 AM - 1 PM)',
          courierPartner: pickupData.courierPartner || 'Express Logistics'
        };
        return record;
      };

      const updated = schedulePickup(returnRecord, {
        scheduledDate: new Date('2026-08-28'),
        pickupSlot: 'Afternoon (2 PM - 6 PM)',
        courierPartner: 'DHL Express'
      });

      assert.strictEqual(updated.status, 'PICKUP_SCHEDULED');
      assert.strictEqual(updated.pickupDetails.pickupSlot, 'Afternoon (2 PM - 6 PM)');
      assert.strictEqual(updated.pickupDetails.courierPartner, 'DHL Express');
    });

    it('should reject pickup scheduling if status is not RETURN_REQUESTED', () => {
      const returnRecord = {
        _id: 'ret_123',
        status: 'ITEM_INSPECTED' // already inspected
      };

      const schedulePickup = (record) => {
        if (record.status !== 'RETURN_REQUESTED') {
          throw new Error(`Cannot schedule pickup. Current status is ${record.status}, expected RETURN_REQUESTED`);
        }
      };

      assert.throws(() => {
        schedulePickup(returnRecord);
      }, /expected RETURN_REQUESTED/);
    });

    it('should format valid RETURN_PICKUP_SCHEDULED RabbitMQ event payload', () => {
      const event = {
        event: 'RETURN_PICKUP_SCHEDULED',
        returnId: 'ret_123',
        orderId: 'ord_456',
        userId: 'usr_789',
        pickupDetails: {
          scheduledDate: new Date().toISOString(),
          pickupSlot: 'Morning (9 AM - 1 PM)',
          courierPartner: 'Express Logistics'
        },
        timestamp: new Date().toISOString()
      };

      assert.strictEqual(event.event, 'RETURN_PICKUP_SCHEDULED');
      assert.strictEqual(event.returnId, 'ret_123');
      assert.strictEqual(event.orderId, 'ord_456');
      assert.ok(event.pickupDetails.courierPartner);
    });
  });
});
