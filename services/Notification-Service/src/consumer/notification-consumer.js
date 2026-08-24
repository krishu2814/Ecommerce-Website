const { startConsumer } = require("./event-consumer");
const NotificationService = require("../service/notification-service");

class NotificationConsumer {
  constructor() {
    this.notificationService = new NotificationService();
  }

  async start() {
    // 1. ORDER_CONFIRMED Consumer
    await startConsumer({
      queueName: "notification_order_confirmed_queue",
      routingKey: "ORDER_CONFIRMED",
      handler: async (event) => {
        if (
          !event.orderId ||
          !event.userId ||
          event.event !== "ORDER_CONFIRMED" ||
          event.corruptData
        ) {
          throw new Error("Invalid ORDER_CONFIRMED event: Missing required fields or corrupted payload");
        }
        await this.notificationService.handleOrderConfirmed(event);
      },
    });

    // 2. ORDER_CANCELLED Consumer
    await startConsumer({
      queueName: "notification_order_cancelled_queue",
      routingKey: "ORDER_CANCELLED",
      handler: async (event) => {
        if (
          !event.orderId ||
          !event.userId ||
          event.event !== "ORDER_CANCELLED" ||
          event.corruptData
        ) {
          throw new Error("Invalid ORDER_CANCELLED event: Missing required fields or corrupted payload");
        }
        await this.notificationService.handleOrderCancelled(event);
      },
    });

    // 3. PAYMENT_FAILED Consumer
    await startConsumer({
      queueName: "notification_payment_failed_queue",
      routingKey: "PAYMENT_FAILED",
      handler: async (event) => {
        if (
          !event.orderId ||
          !event.userId ||
          event.event !== "PAYMENT_FAILED" ||
          event.corruptData
        ) {
          throw new Error("Invalid PAYMENT_FAILED event: Missing required fields or corrupted payload");
        }
        await this.notificationService.handlePaymentFailed(event);
      },
    });

    console.log("[Notification Consumers] All notification queues successfully registered and listening");
  }
}

module.exports = NotificationConsumer;
