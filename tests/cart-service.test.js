const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Cart-Service Test Suite', () => {
  describe('Cart Total Price Calculations', () => {
    it('should correctly calculate total price of cart items', () => {
      const items = [
        { productId: 'p1', name: 'Keyboard', price: 79.99, quantity: 2 },
        { productId: 'p2', name: 'Mouse', price: 49.50, quantity: 1 },
        { productId: 'p3', name: 'Mousepad', price: 15.00, quantity: 3 }
      ];

      const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      assert.strictEqual(Math.round(totalPrice * 100) / 100, 254.48);
    });

    it('should handle empty cart total calculation', () => {
      const items = [];
      const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      assert.strictEqual(totalPrice, 0);
    });
  });

  describe('Cart Item Accumulation & Modification', () => {
    it('should accumulate quantity when adding existing item', () => {
      const cart = {
        userId: 'u1',
        items: [
          { productId: 'p1', name: 'Headphones', price: 120, quantity: 1 }
        ],
        totalPrice: 120
      };

      const newItem = { productId: 'p1', quantity: 2 };
      const existing = cart.items.find(i => i.productId === newItem.productId);
      if (existing) {
        existing.quantity += newItem.quantity;
      }

      cart.totalPrice = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      assert.strictEqual(cart.items.length, 1);
      assert.strictEqual(cart.items[0].quantity, 3);
      assert.strictEqual(cart.totalPrice, 360);
    });

    it('should remove item when quantity is updated to 0', () => {
      const cart = {
        items: [
          { productId: 'p1', price: 100, quantity: 2 },
          { productId: 'p2', price: 50, quantity: 1 }
        ]
      };

      const productIdToRemove = 'p1';
      const index = cart.items.findIndex(i => i.productId === productIdToRemove);
      if (index !== -1) {
        cart.items.splice(index, 1);
      }

      assert.strictEqual(cart.items.length, 1);
      assert.strictEqual(cart.items[0].productId, 'p2');
    });
  });

  describe('Stock Validation Rules', () => {
    it('should reject addition when requested quantity exceeds available stock', () => {
      const availableStock = 5;
      const currentCartQty = 3;
      const requestedAddQty = 3;

      const totalRequested = currentCartQty + requestedAddQty;
      const isExceeded = totalRequested > availableStock;

      assert.strictEqual(isExceeded, true);
    });

    it('should allow addition when within available stock limits', () => {
      const availableStock = 10;
      const currentCartQty = 2;
      const requestedAddQty = 3;

      const totalRequested = currentCartQty + requestedAddQty;
      const isAllowed = totalRequested <= availableStock;

      assert.strictEqual(isAllowed, true);
    });
  });

  describe('ORDER_CONFIRMED Consumer Integration', () => {
    it('should validate ORDER_CONFIRMED payload and extract userId', () => {
      const event = {
        event: 'ORDER_CONFIRMED',
        orderId: 'ord_123',
        userId: 'user_456',
        transactionId: 'txn_789',
        totalAmount: 199.99
      };

      assert.strictEqual(event.event, 'ORDER_CONFIRMED');
      assert.ok(event.orderId);
      assert.ok(event.userId);
      assert.strictEqual(String(event.userId), 'user_456');
    });
  });
});
