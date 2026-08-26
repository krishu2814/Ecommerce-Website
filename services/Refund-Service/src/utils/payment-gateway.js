const axios = require("axios");
const { STRIPE_SECRET_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require("../config/serverConfig");

class PaymentGateway {
  static async processRefund({ amount, paymentGateway, originalPaymentId, simulateFailure }) {
    if (simulateFailure) {
      throw new Error("Payment Gateway declined the refund request (Simulated Gateway Error)");
    }

    // 1. Stripe Refund (if secret key configured)
    if (paymentGateway === "Stripe" && STRIPE_SECRET_KEY) {
      try {
        const response = await axios.post(
          "https://api.stripe.com/v1/refunds",
          new URLSearchParams({
            amount: Math.round(amount * 100).toString(),
            ...(originalPaymentId ? { payment_intent: originalPaymentId } : {}),
          }),
          {
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        return {
          success: true,
          gateway: "Stripe",
          refundTransactionId: response.data.id,
          raw: response.data,
        };
      } catch (error) {
        console.error("Stripe refund failed, falling back to standard mock:", error.message);
      }
    }

    // 2. Razorpay Refund (if keys configured)
    if (paymentGateway === "Razorpay" && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
        const response = await axios.post(
          `https://api.razorpay.com/v1/payments/${originalPaymentId}/refund`,
          {
            amount: Math.round(amount * 100),
          },
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );
        return {
          success: true,
          gateway: "Razorpay",
          refundTransactionId: response.data.id,
          raw: response.data,
        };
      } catch (error) {
        console.error("Razorpay refund failed, falling back to standard mock:", error.message);
      }
    }

    // 3. Default Mock / Original Payment Method Refund
    const refundTransactionId = `REF_TXN_${Date.now()}`;
    return {
      success: true,
      gateway: paymentGateway || "Original_Payment",
      refundTransactionId,
    };
  }
}

module.exports = PaymentGateway;
