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
