const ReturnService = require("../service/return-service");

class ReturnController {
  constructor() {
    this.returnService = new ReturnService();
  }

  async createReturn(req, res) {
    try {
      const userId = req.user.id || req.user.userId;
      const authorization = req.headers.authorization;

      const returnRecord = await this.returnService.createReturnRequest(
        userId,
        req.body,
        authorization
      );

      return res.status(201).json({
        success: true,
        message: "Return request created successfully",
        data: returnRecord,
        error: {},
      });
    } catch (error) {
      console.error("Error creating return request:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create return request",
        data: {},
        error: error.message,
      });
    }
  }

  async getReturnById(req, res) {
    try {
      const returnId = req.params.id;
      const userId = req.user.id || req.user.userId;
      const userRole = req.user.role;

      const returnRecord = await this.returnService.getReturnById(
        returnId,
        userId,
        userRole
      );

      return res.status(200).json({
        success: true,
        message: "Return request fetched successfully",
        data: returnRecord,
        error: {},
      });
    } catch (error) {
      console.error("Error fetching return request:", error.message);
      const statusCode = error.message.includes("not found") ? 404 : 403;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch return request",
        data: {},
        error: error.message,
      });
    }
  }

  async getUserReturns(req, res) {
    try {
      const userId = req.user.id || req.user.userId;
      const returns = await this.returnService.getUserReturns(userId);

      return res.status(200).json({
        success: true,
        message: "User returns fetched successfully",
        data: returns,
        error: {},
      });
    } catch (error) {
      console.error("Error fetching user returns:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch user returns",
        data: {},
        error: error.message,
      });
    }
  }

  async getOrderReturns(req, res) {
    try {
      const orderId = req.params.orderId;
      const returns = await this.returnService.getOrderReturns(orderId);

      return res.status(200).json({
        success: true,
        message: "Order returns fetched successfully",
        data: returns,
        error: {},
      });
    } catch (error) {
      console.error("Error fetching order returns:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch order returns",
        data: {},
        error: error.message,
      });
    }
  }

  async getAllReturns(req, res) {
    try {
      const filter = req.query || {};
      const returns = await this.returnService.getAllReturns(filter);

      return res.status(200).json({
        success: true,
        message: "All returns fetched successfully",
        data: returns,
        error: {},
      });
    } catch (error) {
      console.error("Error fetching all returns:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch all returns",
        data: {},
        error: error.message,
      });
    }
  }

  async schedulePickup(req, res) {
    try {
      const returnId = req.params.id;
      const userId = req.user.id || req.user.userId;
      const userRole = req.user.role;

      const returnRecord = await this.returnService.schedulePickup(
        returnId,
        req.body,
        userId,
        userRole
      );

      return res.status(200).json({
        success: true,
        message: "Pickup scheduled successfully",
        data: returnRecord,
        error: {},
      });
    } catch (error) {
      console.error("Error scheduling pickup:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to schedule pickup",
        data: {},
        error: error.message,
      });
    }
  }

  async recordItemInspection(req, res) {
    try {
      const returnId = req.params.id;
      const returnRecord = await this.returnService.recordItemInspection(
        returnId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Item inspection recorded successfully",
        data: returnRecord,
        error: {},
      });
    } catch (error) {
      console.error("Error recording inspection:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to record item inspection",
        data: {},
        error: error.message,
      });
    }
  }

  async processRefund(req, res) {
    try {
      const returnId = req.params.id;
      const returnRecord = await this.returnService.processRefund(
        returnId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: returnRecord,
        error: {},
      });
    } catch (error) {
      console.error("Error processing refund:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to process refund",
        data: {},
        error: error.message,
      });
    }
  }

  async getShippingLabel(req, res) {
    try {
      const returnId = req.params.id;
      const userId = req.user.id || req.user.userId;
      const userRole = req.user.role;

      const label = await this.returnService.getShippingLabel(
        returnId,
        userId,
        userRole
      );

      return res.status(200).json({
        success: true,
        message: "Shipping label retrieved successfully",
        data: label,
        error: {},
      });
    } catch (error) {
      console.error("Error retrieving shipping label:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to retrieve shipping label",
        data: {},
        error: error.message,
      });
    }
  }
}

module.exports = ReturnController;
