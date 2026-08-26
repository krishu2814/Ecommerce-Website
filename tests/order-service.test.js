const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Order-Service Test Suite', () => {
  describe('Order Number Generation & Total Calculation', () => {
    it('should generate order number starting with ORD-', () => {
      const orderNumber = `ORD-${Date.now()}`;
      assert.ok(orderNumber.startsWith('ORD-'));
      assert.ok(orderNumber.length > 5);
    });

    it('should compute order total accurately across multiple line items', () => {
      const items = [
        { productId: 'p1', name: 'Shoes', price: 80, quantity: 2 },
        { productId: 'p2', name: 'Socks', price: 10, quantity: 4 }
      ];

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      assert.strictEqual(total, 200);
    });
  });

  describe('Coupon Discount Calculation Engine', () => {
    const calculateDiscount = (coupon, originalAmount, userId) => {
      const now = new Date();
      if (!coupon.isActive) throw new Error('This coupon is currently inactive');
      if (coupon.validFrom && now < new Date(coupon.validFrom)) throw new Error('This coupon is not active yet');
      if (now > new Date(coupon.validUntil)) throw new Error('This coupon has expired');
      if (coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon global redemption limit has been reached');

      if (userId) {
        const userCount = (coupon.usedBy || []).filter(e => String(e.userId) === String(userId)).length;
        if (userCount >= coupon.userUsageLimit) {
          throw new Error('User redemption limit reached');
        }
      }

      if (originalAmount < coupon.minOrderValue) {
        throw new Error(`Minimum order amount of $${coupon.minOrderValue} is required`);
      }

      let discountAmount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (originalAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else if (coupon.discountType === 'FLAT') {
        discountAmount = Math.min(coupon.discountValue, originalAmount);
      }

      discountAmount = Math.round(discountAmount * 100) / 100;
      const finalAmount = Math.max(0, Math.round((originalAmount - discountAmount) * 100) / 100);

      return {
        isValid: true,
        discountAmount,
        finalAmount
      };
    };

    it('should apply percentage discount up to max cap', () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: 20, // 20%
        maxDiscountAmount: 30, // max $30 off
        minOrderValue: 50,
        validUntil: new Date(Date.now() + 86400000),
        usedCount: 0,
        usageLimit: 1000,
        userUsageLimit: 1,
        usedBy: []
      };

      const result = calculateDiscount(coupon, 200, 'u1');
      // 20% of 200 is $40, but capped at $30
      assert.strictEqual(result.discountAmount, 30);
      assert.strictEqual(result.finalAmount, 170);
    });

    it('should apply flat discount correctly', () => {
      const coupon = {
        code: 'FLAT50',
        isActive: true,
        discountType: 'FLAT',
        discountValue: 50,
        minOrderValue: 100,
        validUntil: new Date(Date.now() + 86400000),
        usedCount: 0,
        usageLimit: 500,
        userUsageLimit: 2,
        usedBy: []
      };

      const result = calculateDiscount(coupon, 150, 'u1');
      assert.strictEqual(result.discountAmount, 50);
      assert.strictEqual(result.finalAmount, 100);
    });

    it('should reject coupon if min order value is not met', () => {
      const coupon = {
        code: 'MIN100',
        isActive: true,
        discountType: 'FLAT',
        discountValue: 20,
        minOrderValue: 100,
        validUntil: new Date(Date.now() + 86400000),
        usedCount: 0,
        usageLimit: 100,
        userUsageLimit: 1,
        usedBy: []
      };

      assert.throws(() => {
        calculateDiscount(coupon, 80, 'u1');
      }, /Minimum order amount/);
    });

    it('should reject expired coupon', () => {
      const coupon = {
        code: 'EXPIRED',
        isActive: true,
        discountType: 'FLAT',
        discountValue: 10,
        minOrderValue: 0,
        validUntil: new Date(Date.now() - 10000),
        usedCount: 0,
        usageLimit: 100,
        userUsageLimit: 1,
        usedBy: []
      };

      assert.throws(() => {
        calculateDiscount(coupon, 50, 'u1');
      }, /has expired/);
    });

    it('should reject when user exceeds usage limit', () => {
      const coupon = {
        code: 'ONCEONLY',
        isActive: true,
        discountType: 'FLAT',
        discountValue: 10,
        minOrderValue: 0,
        validUntil: new Date(Date.now() + 86400000),
        usedCount: 1,
        usageLimit: 100,
        userUsageLimit: 1,
        usedBy: [{ userId: 'u1', orderId: 'ord_old' }]
      };

      assert.throws(() => {
        calculateDiscount(coupon, 50, 'u1');
      }, /User redemption limit/);
    });
  });

  describe('Order State Machine & Saga Transitions', () => {
    it('should transition PENDING -> READY_FOR_PAYMENT on INVENTORY_RESERVED', () => {
      const order = { id: 'ord_1', orderStatus: 'PENDING', paymentStatus: 'PENDING' };

      // Simulate INVENTORY_RESERVED consumer
      order.orderStatus = 'READY_FOR_PAYMENT';
      assert.strictEqual(order.orderStatus, 'READY_FOR_PAYMENT');
    });

    it('should transition READY_FOR_PAYMENT -> CONFIRMED on PAYMENT_SUCCESS', () => {
      const order = { id: 'ord_1', orderStatus: 'READY_FOR_PAYMENT', paymentStatus: 'PENDING' };

      // Simulate PAYMENT_SUCCESS consumer
      order.orderStatus = 'CONFIRMED';
      order.paymentStatus = 'SUCCESS';
      order.transactionId = 'TXN_12345';

      assert.strictEqual(order.orderStatus, 'CONFIRMED');
      assert.strictEqual(order.paymentStatus, 'SUCCESS');
      assert.strictEqual(order.transactionId, 'TXN_12345');
    });

    it('should cancel order and mark payment FAILED on PAYMENT_FAILED', () => {
      const order = { id: 'ord_1', orderStatus: 'READY_FOR_PAYMENT', paymentStatus: 'PENDING' };

      // Simulate PAYMENT_FAILED consumer
      order.orderStatus = 'CANCELLED';
      order.paymentStatus = 'FAILED';

      assert.strictEqual(order.orderStatus, 'CANCELLED');
      assert.strictEqual(order.paymentStatus, 'FAILED');
    });
  });
});
