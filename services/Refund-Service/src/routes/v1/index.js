const express = require("express");
const router = express.Router();
const Authentication = require("../../middleware/authentication");
const ReturnController = require("../../controller/return-controller");

const returnController = new ReturnController();

// Diagnostics
router.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy",
    service: "refund-service",
    timestamp: new Date().toISOString(),
  });
});

// Return & Refund Endpoints
router.post("/", Authentication, returnController.createReturn.bind(returnController));
router.get("/my-returns", Authentication, returnController.getUserReturns.bind(returnController));
router.get("/order/:orderId", Authentication, returnController.getOrderReturns.bind(returnController));
router.get("/all", Authentication, returnController.getAllReturns.bind(returnController));
router.get("/:id", Authentication, returnController.getReturnById.bind(returnController));
router.post("/:id/pickup", Authentication, returnController.schedulePickup.bind(returnController));
router.post("/:id/inspect", Authentication, returnController.recordItemInspection.bind(returnController));
router.post("/:id/refund", Authentication, returnController.processRefund.bind(returnController));
router.get("/:id/shipping-label", Authentication, returnController.getShippingLabel.bind(returnController));

module.exports = router;
