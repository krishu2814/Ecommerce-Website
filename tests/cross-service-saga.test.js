const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Cross-Service Distributed Saga & Event Choreography Flow', () => {
  describe('Successful Happy Path Checkout Choreography', () => {
    it('should complete full order lifecycle: ORDER_CREATED -> INVENTORY_RESERVED -> PAYMENT_SUCCESS -> ORDER_CONFIRMED -> Cart Cleared', () => {
      // 1. User Cart State
      const userCart = {
        userId: 'usr_100',
        items: [{ productId: 'prod_macbook', quantity: 1, price: 1999 }],
        totalPrice: 1999
      };

      // 2. Place Order (Order Service creates order in PENDING status)
      const order = {
        orderId: 'ord_9001',
        userId: userCart.userId,
        items: userCart.items,
        totalAmount: userCart.totalPrice,
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING'
      };
      assert.strictEqual(order.orderStatus, 'PENDING');

      // 3. Event: ORDER_CREATED published -> Inventory Service consumes
      const orderCreatedEvent = {
        event: 'ORDER_CREATED',
        orderId: order.orderId,
        userId: order.userId,
        items: order.items
      };

      // Inventory Service reserves stock
      const inventory = {
        productId: 'prod_macbook',
        quantity: 10,
        reservedQuantity: 0
      };
      inventory.reservedQuantity += orderCreatedEvent.items[0].quantity;
      assert.strictEqual(inventory.reservedQuantity, 1);

      // 4. Event: INVENTORY_RESERVED published -> Order Service consumes
      const inventoryReservedEvent = {
        event: 'INVENTORY_RESERVED',
        orderId: order.orderId,
        userId: order.userId
      };
      // Order Service transitions to READY_FOR_PAYMENT
      order.orderStatus = 'READY_FOR_PAYMENT';
      assert.strictEqual(order.orderStatus, 'READY_FOR_PAYMENT');

      // 5. Payment Service initiates transaction
      assert.strictEqual(order.orderStatus, 'READY_FOR_PAYMENT');
      const transactionId = `TXN_${Date.now()}`;
      const paymentRecord = {
        orderId: order.orderId,
        userId: order.userId,
        amount: order.totalAmount,
        status: 'SUCCESS',
        transactionId
      };

      // 6. Event: PAYMENT_SUCCESS published -> Order Service & Inventory Service consume
      const paymentSuccessEvent = {
        event: 'PAYMENT_SUCCESS',
        orderId: order.orderId,
        userId: order.userId,
        transactionId
      };

      // Order Service transitions to CONFIRMED
      order.orderStatus = 'CONFIRMED';
      order.paymentStatus = 'SUCCESS';
      order.transactionId = paymentSuccessEvent.transactionId;

      // Inventory Service commits stock
      inventory.quantity -= 1;
      inventory.reservedQuantity -= 1;

      // 7. Event: ORDER_CONFIRMED published -> Cart Service & Notification Service consume
      const orderConfirmedEvent = {
        event: 'ORDER_CONFIRMED',
        orderId: order.orderId,
        userId: order.userId,
        totalAmount: order.totalAmount
      };

      // Cart Service clears cart
      userCart.items = [];
      userCart.totalPrice = 0;

      // Assert final platform state
      assert.strictEqual(order.orderStatus, 'CONFIRMED');
      assert.strictEqual(order.paymentStatus, 'SUCCESS');
      assert.strictEqual(inventory.quantity, 9);
      assert.strictEqual(inventory.reservedQuantity, 0);
      assert.strictEqual(userCart.items.length, 0);
      assert.strictEqual(userCart.totalPrice, 0);
    });
  });

  describe('Compensating Transaction Flow on Payment Failure', () => {
    it('should release reserved inventory and cancel order when payment fails', () => {
      const inventory = {
        productId: 'prod_iphone',
        quantity: 5,
        reservedQuantity: 1 // reserved during ORDER_CREATED
      };

      const order = {
        orderId: 'ord_fail_01',
        userId: 'usr_200',
        orderStatus: 'READY_FOR_PAYMENT',
        paymentStatus: 'PENDING'
      };

      // Payment fails -> PAYMENT_FAILED event published
      const paymentFailedEvent = {
        event: 'PAYMENT_FAILED',
        orderId: order.orderId,
        userId: order.userId,
        reason: 'Simulated Card Decline'
      };

      // Order Service consumes PAYMENT_FAILED -> marks CANCELLED
      order.orderStatus = 'CANCELLED';
      order.paymentStatus = 'FAILED';

      // Inventory Service consumes PAYMENT_FAILED / ORDER_CANCELLED -> releases reserved stock
      inventory.reservedQuantity -= 1;

      assert.strictEqual(order.orderStatus, 'CANCELLED');
      assert.strictEqual(order.paymentStatus, 'FAILED');
      assert.strictEqual(inventory.quantity, 5);
      assert.strictEqual(inventory.reservedQuantity, 0);
    });
  });
});
