const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "RETURN_REQUESTED",
        "PICKUP_SCHEDULED",
        "ITEM_INSPECTED",
        "REFUND_PROCESSED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "RETURN_REQUESTED",
      index: true,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundType: {
      type: String,
      enum: ["FULL", "PARTIAL"],
      default: "FULL",
    },
    paymentMethod: {
      type: String,
      default: "CARD",
    },
    paymentGateway: {
      type: String,
      enum: ["Stripe", "Razorpay", "PayPal", "Original_Payment"],
      default: "Original_Payment",
    },
    refundTransactionId: {
      type: String,
    },
    pickupDetails: {
      pickupAddress: { type: String },
      scheduledDate: { type: Date },
      pickupSlot: { type: String },
      courierPartner: { type: String, default: "Standard Logistics" },
      trackingNumber: { type: String },
    },
    inspectionDetails: {
      inspectorName: { type: String },
      inspectionDate: { type: Date },
      itemCondition: {
        type: String,
        enum: ["GOOD", "DAMAGED", "DEFECTIVE", "WRONG_ITEM", "USED"],
        default: "GOOD",
      },
      passed: { type: Boolean, default: true },
      notes: { type: String },
    },
    shippingLabel: {
      labelId: { type: String },
      trackingNumber: { type: String },
      carrier: { type: String, default: "Express Returns" },
      labelUrl: { type: String },
      generatedAt: { type: Date },
    },
    correlationId: {
      type: String,
    },
  },
  { timestamps: true }
);

returnSchema.index({ orderId: 1, userId: 1 });
returnSchema.index({ createdAt: -1 });

const Return = mongoose.model("Return", returnSchema);

module.exports = Return;
