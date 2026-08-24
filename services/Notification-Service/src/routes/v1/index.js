const express = require("express");
const NotificationController = require("../../controller/notification-controller");
const authentication = require("../../middleware/authentication");

const router = express.Router();
const notificationController = new NotificationController();

// Routes
router.get(
  "/my-notifications",
  authentication,
  notificationController.getMyNotifications.bind(notificationController),
);

router.get(
  "/:id",
  authentication,
  notificationController.getNotificationById.bind(notificationController),
);

module.exports = router;
