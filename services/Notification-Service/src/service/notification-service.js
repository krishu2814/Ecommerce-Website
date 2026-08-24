const NotificationRepository = require("../repository/notification-repository");
const { createTransporter } = require("../config/emailConfig");
const { EMAIL_FROM } = require("../config/serverConfig");

class NotificationService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  /**
   * Helper to dispatch email and persist notification log.
   */
  async _dispatchAndLog({
    userId,
    orderId,
    recipientEmail,
    recipientPhone,
    type,
    subject,
    htmlContent,
    correlationId,
    metadata = {},
  }) {
    const notification = await this.notificationRepository.createNotification({
      userId,
      orderId,
      recipientEmail,
      recipientPhone,
      channel: "EMAIL",
      type,
      subject,
      content: htmlContent,
      status: "PENDING",
      correlationId,
      metadata,
    });

    try {
      const transporter = await createTransporter();
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: recipientEmail,
        subject,
        html: htmlContent,
      });

      const updated = await this.notificationRepository.updateNotificationStatus(
        notification._id,
        "SENT",
      );

      console.log(
        `[${correlationId || "corr_unknown"}] [Notification Service] Dispatched ${type} email to ${recipientEmail} for Order ${orderId || "N/A"}`,
      );

      return updated;
    } catch (err) {
      console.error(
        `[${correlationId || "corr_unknown"}] [Notification Service Error] Failed to send email to ${recipientEmail}:`,
        err.message,
      );

      await this.notificationRepository.updateNotificationStatus(
        notification._id,
        "FAILED",
        err.message,
      );

      throw err;
    }
  }

  /**
   * Handles ORDER_CONFIRMED event.
   */
  async handleOrderConfirmed(event) {
    const { orderId, userId, userEmail, totalAmount, deliveryAddress, correlationId } = event;
    const email = userEmail || `${userId}@ecommerce-customer.com`;
    const subject = `🎉 Order Confirmed! [Order #${orderId || "N/A"}]`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16a34a; margin: 0; font-size: 24px;">✅ Order Confirmed!</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Thank you for shopping with us.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 6px 0; color: #334155;"><strong>Order ID:</strong> <span style="color: #0f172a;">${orderId}</span></p>
          <p style="margin: 6px 0; color: #334155;"><strong>Total Amount:</strong> <span style="color: #16a34a; font-weight: bold;">$${Number(totalAmount || 0).toFixed(2)}</span></p>
          <p style="margin: 6px 0; color: #334155;"><strong>Delivery Address:</strong> ${deliveryAddress || "Standard Address"}</p>
          <p style="margin: 6px 0; color: #334155;"><strong>Status:</strong> <span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 600;">CONFIRMED</span></p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Your package is being prepared at our fulfillment center and will be dispatched shortly.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Trace ID: ${correlationId || "N/A"} • Distributed Ecommerce Platform</p>
      </div>
    `;

    return await this._dispatchAndLog({
      userId: String(userId || "guest"),
      orderId: String(orderId),
      recipientEmail: email,
      type: "ORDER_CONFIRMED",
      subject,
      htmlContent,
      correlationId,
      metadata: { totalAmount, deliveryAddress, eventTimestamp: event.timestamp },
    });
  }

  /**
   * Handles ORDER_CANCELLED event.
   */
  async handleOrderCancelled(event) {
    const { orderId, userId, userEmail, reason, correlationId } = event;
    const email = userEmail || `${userId}@ecommerce-customer.com`;
    const subject = `⚠️ Order Cancelled [Order #${orderId || "N/A"}]`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 24px;">⚠️ Order Cancelled</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your order has been cancelled and any reserved items released.</p>
        </div>
        <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
          <p style="margin: 6px 0; color: #334155;"><strong>Order ID:</strong> ${orderId}</p>
          <p style="margin: 6px 0; color: #991b1b;"><strong>Reason:</strong> ${reason || "Payment declined or unfulfilled reservation"}</p>
          <p style="margin: 6px 0; color: #334155;"><strong>Status:</strong> <span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: 600;">CANCELLED</span></p>
        </div>
        <p style="color: #64748b; font-size: 13px;">If you were charged, a full refund has been initiated to your original payment method.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Trace ID: ${correlationId || "N/A"} • Distributed Ecommerce Platform</p>
      </div>
    `;

    return await this._dispatchAndLog({
      userId: String(userId || "guest"),
      orderId: String(orderId),
      recipientEmail: email,
      type: "ORDER_CANCELLED",
      subject,
      htmlContent,
      correlationId,
      metadata: { reason, eventTimestamp: event.timestamp },
    });
  }

  /**
   * Handles PAYMENT_FAILED event.
   */
  async handlePaymentFailed(event) {
    const { orderId, userId, userEmail, amount, reason, correlationId } = event;
    const email = userEmail || `${userId}@ecommerce-customer.com`;
    const subject = `❌ Payment Failed [Order #${orderId || "N/A"}]`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ea580c; margin: 0; font-size: 24px;">❌ Payment Failed</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">We could not process your payment for this transaction.</p>
        </div>
        <div style="background: #fff7ed; padding: 16px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f97316;">
          <p style="margin: 6px 0; color: #334155;"><strong>Order ID:</strong> ${orderId}</p>
          <p style="margin: 6px 0; color: #334155;"><strong>Amount:</strong> $${Number(amount || 0).toFixed(2)}</p>
          <p style="margin: 6px 0; color: #c2410c;"><strong>Decline Reason:</strong> ${reason || "Card authorization declined"}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Please check your payment method and retry the checkout process.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Trace ID: ${correlationId || "N/A"} • Distributed Ecommerce Platform</p>
      </div>
    `;

    return await this._dispatchAndLog({
      userId: String(userId || "guest"),
      orderId: String(orderId),
      recipientEmail: email,
      type: "PAYMENT_FAILED",
      subject,
      htmlContent,
      correlationId,
      metadata: { amount, reason, eventTimestamp: event.timestamp },
    });
  }

  async getUserNotifications(userId) {
    return await this.notificationRepository.getNotificationsByUserId(userId);
  }

  async getNotificationById(id) {
    return await this.notificationRepository.getNotificationById(id);
  }
}

module.exports = NotificationService;
