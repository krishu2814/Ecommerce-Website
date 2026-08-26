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
