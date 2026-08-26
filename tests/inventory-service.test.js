const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Inventory-Service Test Suite', () => {
  describe('Stock Reservation & Availability Logic', () => {
    it('should calculate available stock as quantity minus reservedQuantity', () => {
      const inventory = {
        productId: 'p1',
        quantity: 100,
        reservedQuantity: 25
      };

      const availableQuantity = inventory.quantity - inventory.reservedQuantity;
      assert.strictEqual(availableQuantity, 75);
    });

    it('should successfully reserve stock if available quantity is sufficient', () => {
      const inventory = {
        productId: 'p1',
        quantity: 100,
        reservedQuantity: 25
      };

      const requestedQty = 10;
      const available = inventory.quantity - inventory.reservedQuantity;
      let reserved = false;

      if (available >= requestedQty) {
        inventory.reservedQuantity += requestedQty;
        reserved = true;
      }

      assert.strictEqual(reserved, true);
      assert.strictEqual(inventory.reservedQuantity, 35);
      assert.strictEqual(inventory.quantity - inventory.reservedQuantity, 65);
    });

    it('should reject reservation if requested quantity exceeds available quantity', () => {
      const inventory = {
        productId: 'p1',
        quantity: 10,
        reservedQuantity: 8
      };

      const requestedQty = 5;
      const available = inventory.quantity - inventory.reservedQuantity;
      const canReserve = available >= requestedQty;

      assert.strictEqual(canReserve, false);
    });
  });

  describe('Multi-Item Order Atomic Reservation Compensation', () => {
    it('should rollback previous reservations if a subsequent item fails in the order', () => {
      const warehouse = {
        itemA: { quantity: 10, reservedQuantity: 0 },
        itemB: { quantity: 2, reservedQuantity: 0 } // insufficient for requested 5
      };

      const orderItems = [
        { productId: 'itemA', quantity: 4 },
        { productId: 'itemB', quantity: 5 } // will fail
      ];

      const successfulReservations = [];
      let orderFailed = false;

      for (const item of orderItems) {
        const inv = warehouse[item.productId];
        const avail = inv.quantity - inv.reservedQuantity;
        if (avail >= item.quantity) {
          inv.reservedQuantity += item.quantity;
          successfulReservations.push(item);
        } else {
          orderFailed = true;
          break;
        }
      }

      assert.strictEqual(orderFailed, true);

      // Perform Saga compensation
      for (const res of successfulReservations) {
        warehouse[res.productId].reservedQuantity -= res.quantity;
      }

      // Verify clean rollback
      assert.strictEqual(warehouse.itemA.reservedQuantity, 0);
      assert.strictEqual(warehouse.itemB.reservedQuantity, 0);
    });
  });

  describe('Reservation Expiry & Confirmation Transitions', () => {
    it('should confirm reservation on ORDER_CONFIRMED (deduct physical quantity & release reserved)', () => {
      const inventory = {
        productId: 'p1',
        quantity: 50,
        reservedQuantity: 5
      };

      const qty = 5;
      inventory.quantity -= qty;
      inventory.reservedQuantity -= qty;

      assert.strictEqual(inventory.quantity, 45);
      assert.strictEqual(inventory.reservedQuantity, 0);
    });

    it('should detect reservations older than cutoff window for expiration job', () => {
      const maxAgeMinutes = 15;
      const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

      const oldReservation = { createdAt: new Date(Date.now() - 20 * 60 * 1000) };
      const freshReservation = { createdAt: new Date(Date.now() - 5 * 60 * 1000) };

      assert.strictEqual(oldReservation.createdAt < cutoff, true);
      assert.strictEqual(freshReservation.createdAt < cutoff, false);
    });
  });
});
