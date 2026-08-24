const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientPhone: {
      type: String,
    },
    channel: {
      type: String,
      enum: ["EMAIL", "SMS", "PUSH"],
      default: "EMAIL",
    },
    type: {
      type: String,
      enum: [
        "ORDER_CONFIRMED",
        "ORDER_CANCELLED",
        "PAYMENT_FAILED",
        "PAYMENT_SUCCESS",
        "WELCOME_EMAIL",
        "CUSTOM",
      ],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
