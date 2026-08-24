const Notification = require("../model/notification-model");

class NotificationRepository {
  async createNotification(data) {
    try {
      const notification = await Notification.create(data);
      return notification;
    } catch (error) {
      console.error("Error creating notification in repository:", error.message);
      throw error;
    }
  }

  async getNotificationById(id) {
    try {
      return await Notification.findById(id);
    } catch (error) {
      console.error("Error fetching notification by ID in repository:", error.message);
      throw error;
    }
  }

  async getNotificationsByUserId(userId, limit = 50) {
    try {
      return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error fetching notifications for user in repository:", error.message);
      throw error;
    }
  }

  async getNotificationsByOrderId(orderId) {
    try {
      return await Notification.find({ orderId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error fetching notifications for order in repository:", error.message);
      throw error;
    }
  }

  async updateNotificationStatus(id, status, errorMessage = null) {
    try {
      const updateData = { status };
      if (errorMessage) updateData.errorMessage = errorMessage;
      return await Notification.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      console.error("Error updating notification status in repository:", error.message);
      throw error;
    }
  }
}

module.exports = NotificationRepository;
