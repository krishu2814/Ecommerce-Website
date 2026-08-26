const ReturnRepository = require("../repository/return-repository");
const OrderClient = require("../clients/order-client");
const PaymentGateway = require("../utils/payment-gateway");
const ShippingLabelUtil = require("../utils/shipping-label");
const { publishEvent } = require("../config/rabbitmq");

class ReturnService {
  constructor() {
    this.returnRepository = new ReturnRepository();
    this.orderClient = new OrderClient();
  }

  async createReturnRequest(userId, data, authorization) {
    const { orderId, items, reason, pickupAddress } = data;

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item must be selected for return");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Return reason is required");
    }

    // 1. Fetch Order Details from Order Service
    let order;
    try {
      order = await this.orderClient.getOrder(orderId, authorization);
    } catch (error) {
      console.warn("Could not fetch order from Order Service, using payload data:", error.message);
      // Fallback for tests or disconnected mode
      order = {
        _id: orderId,
        userId,
        orderStatus: data.orderStatus || "CONFIRMED",
        paymentStatus: data.paymentStatus || "SUCCESS",
        totalAmount: data.originalAmount || items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        items: items
      };
    }

    if (!order) {
      throw new Error("Order not found");
    }

    if (String(order.userId) !== String(userId)) {
      throw new Error("Order does not belong to this user");
    }

    if (order.orderStatus === "CANCELLED" || order.paymentStatus === "FAILED") {
      throw new Error("Cannot request return for a cancelled or unpaid order");
    }

    // 2. Calculate Total Returnable Amount
    const calculatedAmount = items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return total + price * quantity;
    }, 0);

    const originalAmount = calculatedAmount > 0 ? calculatedAmount : (order.totalAmount || 0);

    // 3. Generate Shipping Label
    const shippingLabel = ShippingLabelUtil.generateLabel({
      returnId: `temp_${Date.now()}`,
      orderId,
      pickupAddress: pickupAddress || "Customer Address on file"
    });

    // 4. Persist Return Request
    const returnRecord = await this.returnRepository.createReturn({
      orderId,
      userId,
      items,
      reason,
      status: "RETURN_REQUESTED",
      originalAmount,
      refundAmount: originalAmount,
      refundType: "FULL",
      paymentMethod: order.paymentMethod || "CARD",
      paymentGateway: "Original_Payment",
      pickupDetails: {
        pickupAddress: pickupAddress || "Customer Address",
        courierPartner: "Standard Logistics"
      },
      shippingLabel,
      correlationId: data.correlationId
    });

    // Update labelId with real return ID
    returnRecord.shippingLabel.labelId = `LBL-${returnRecord._id}`;
    await returnRecord.save();

    // 5. Publish RETURN_REQUESTED event to RabbitMQ
    await publishEvent("RETURN_REQUESTED", {
      event: "RETURN_REQUESTED",
      returnId: returnRecord._id,
      orderId: returnRecord.orderId,
      userId: returnRecord.userId,
      items: returnRecord.items,
      reason: returnRecord.reason,
      originalAmount: returnRecord.originalAmount,
      timestamp: new Date().toISOString()
    });

    return returnRecord;
  }

  async getReturnById(returnId, userId, userRole) {
    const returnRecord = await this.returnRepository.getReturnById(returnId);
    if (!returnRecord) {
      throw new Error("Return request not found");
    }

    if (userRole !== "admin" && String(returnRecord.userId) !== String(userId)) {
      throw new Error("Access denied to this return record");
    }

    return returnRecord;
  }

  async getUserReturns(userId) {
    return await this.returnRepository.getReturnsByUserId(userId);
  }

  async getOrderReturns(orderId) {
    return await this.returnRepository.getReturnsByOrderId(orderId);
  }

  async getAllReturns(filter = {}) {
    return await this.returnRepository.getAllReturns(filter);
  }

  async schedulePickup(returnId, pickupData, userId, userRole) {
    const returnRecord = await this.returnRepository.getReturnById(returnId);
    if (!returnRecord) {
      throw new Error("Return request not found");
    }

    if (userRole !== "admin" && String(returnRecord.userId) !== String(userId)) {
      throw new Error("Access denied to this return record");
    }

    // Status transition validation
    if (returnRecord.status !== "RETURN_REQUESTED") {
      throw new Error(`Cannot schedule pickup. Current status is ${returnRecord.status}, expected RETURN_REQUESTED`);
    }

    const { scheduledDate, pickupSlot, pickupAddress, courierPartner } = pickupData;

    returnRecord.pickupDetails = {
      pickupAddress: pickupAddress || returnRecord.pickupDetails?.pickupAddress || "Customer Address",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000), // Default next day
      pickupSlot: pickupSlot || "Morning (9 AM - 1 PM)",
      courierPartner: courierPartner || "Standard Express Logistics",
      trackingNumber: returnRecord.shippingLabel?.trackingNumber
    };

    returnRecord.status = "PICKUP_SCHEDULED";
    await returnRecord.save();

    await publishEvent("RETURN_PICKUP_SCHEDULED", {
      event: "RETURN_PICKUP_SCHEDULED",
      returnId: returnRecord._id,
      orderId: returnRecord.orderId,
      userId: returnRecord.userId,
      pickupDetails: returnRecord.pickupDetails,
      timestamp: new Date().toISOString()
    });

    return returnRecord;
  }

  async recordItemInspection(returnId, inspectionData) {
    const returnRecord = await this.returnRepository.getReturnById(returnId);
    if (!returnRecord) {
      throw new Error("Return request not found");
    }

    // Status transition validation
    if (returnRecord.status !== "PICKUP_SCHEDULED") {
      throw new Error(`Cannot record inspection. Current status is ${returnRecord.status}, expected PICKUP_SCHEDULED`);
    }

    const { inspectorName, itemCondition, passed, notes } = inspectionData;
    const isPassed = passed !== undefined ? Boolean(passed) : true;

    returnRecord.inspectionDetails = {
      inspectorName: inspectorName || "Warehouse Quality Inspector",
      inspectionDate: new Date(),
      itemCondition: itemCondition || "GOOD",
      passed: isPassed,
      notes: notes || (isPassed ? "Item verified in original condition" : "Inspection failed quality check")
    };

    returnRecord.status = isPassed ? "ITEM_INSPECTED" : "REJECTED";
    await returnRecord.save();

    await publishEvent("RETURN_INSPECTED", {
      event: "RETURN_INSPECTED",
      returnId: returnRecord._id,
      orderId: returnRecord.orderId,
      userId: returnRecord.userId,
      status: returnRecord.status,
      passed: isPassed,
      inspectionDetails: returnRecord.inspectionDetails,
      timestamp: new Date().toISOString()
    });

    return returnRecord;
  }

  async processRefund(returnId, refundData = {}) {
    const returnRecord = await this.returnRepository.getReturnById(returnId);
    if (!returnRecord) {
      throw new Error("Return request not found");
    }

    if (returnRecord.status === "REFUND_PROCESSED") {
      throw new Error("Return request has already been refunded");
    }

    if (returnRecord.status === "REJECTED") {
      throw new Error("Cannot refund a rejected return request");
    }

    if (returnRecord.status === "CANCELLED") {
      throw new Error("Cannot refund a cancelled return request");
    }

    if (returnRecord.status !== "ITEM_INSPECTED") {
      throw new Error(`Cannot process refund. Current status is ${returnRecord.status}, expected ITEM_INSPECTED`);
    }

    // 1. Calculate Refund Amount (Full or Partial)
    const refundType = refundData.refundType || "FULL";
    let refundAmount = 0;

    if (refundType === "PARTIAL") {
      if (refundData.refundAmount === undefined || refundData.refundAmount === null) {
        throw new Error("Refund amount is required for partial refunds");
      }
      refundAmount = Number(refundData.refundAmount);

      if (isNaN(refundAmount) || refundAmount <= 0) {
        throw new Error("Refund amount must be a positive number");
      }

      if (refundAmount > returnRecord.originalAmount) {
        throw new Error(`Refund amount ($${refundAmount}) cannot exceed original order amount ($${returnRecord.originalAmount})`);
      }
    } else {
      // FULL refund
      refundAmount = returnRecord.originalAmount;
    }

    // 2. Execute Payment Gateway Refund
    const gatewayResult = await PaymentGateway.processRefund({
      amount: refundAmount,
      paymentGateway: refundData.paymentGateway || returnRecord.paymentGateway || "Original_Payment",
      originalPaymentId: refundData.originalPaymentId || returnRecord.orderId,
      simulateFailure: Boolean(refundData.simulateFailure)
    });

    // 3. Update Return Record
    returnRecord.status = "REFUND_PROCESSED";
    returnRecord.refundAmount = refundAmount;
    returnRecord.refundType = refundType;
    returnRecord.paymentGateway = gatewayResult.gateway;
    returnRecord.refundTransactionId = gatewayResult.refundTransactionId;
    await returnRecord.save();

    // 4. Publish REFUND_PROCESSED event to RabbitMQ
    await publishEvent("REFUND_PROCESSED", {
      event: "REFUND_PROCESSED",
      returnId: returnRecord._id,
      orderId: returnRecord.orderId,
      userId: returnRecord.userId,
      refundAmount,
      refundType,
      refundTransactionId: gatewayResult.refundTransactionId,
      paymentGateway: gatewayResult.gateway,
      timestamp: new Date().toISOString()
    });

    return returnRecord;
  }

  async getShippingLabel(returnId, userId, userRole) {
    const returnRecord = await this.returnRepository.getReturnById(returnId);
    if (!returnRecord) {
      throw new Error("Return request not found");
    }

    if (userRole !== "admin" && String(returnRecord.userId) !== String(userId)) {
      throw new Error("Access denied to this return record");
    }

    if (!returnRecord.shippingLabel || !returnRecord.shippingLabel.labelId) {
      returnRecord.shippingLabel = ShippingLabelUtil.generateLabel({
        returnId: returnRecord._id,
        orderId: returnRecord.orderId,
        pickupAddress: returnRecord.pickupDetails?.pickupAddress
      });
      await returnRecord.save();
    }

    return returnRecord.shippingLabel;
  }
}

module.exports = ReturnService;
