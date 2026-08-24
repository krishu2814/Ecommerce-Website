const NotificationService = require("../service/notification-service");

class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
  }

  async getMyNotifications(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          data: [],
          message: "User ID not found in token",
          error: "Unauthorized",
        });
      }

      const notifications = await this.notificationService.getUserNotifications(userId);

      return res.status(200).json({
        success: true,
        data: notifications,
        message: "Notifications fetched successfully",
        error: {},
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: [],
        message: "Failed to fetch notifications",
        error: error.message,
      });
    }
  }

  async getNotificationById(req, res) {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          data: {},
          message: "Notification not found",
          error: "Not Found",
        });
      }

      return res.status(200).json({
        success: true,
        data: notification,
        message: "Notification fetched successfully",
        error: {},
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: {},
        message: "Failed to fetch notification",
        error: error.message,
      });
    }
  }
}

module.exports = NotificationController;
