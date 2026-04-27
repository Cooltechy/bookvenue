const Notification = require('../models/Notification');

class NotificationRepository {
    async create(data) {
        const notification = new Notification(data);
        return await notification.save();
    }

    async findByRecipient(recipientId) {
        return await Notification.find({ recipientId })
            .sort({ createdAt: -1 })
            .limit(50);
    }

    async findUnreadByRecipient(recipientId) {
        return await Notification.find({ recipientId, read: false })
            .sort({ createdAt: -1 });
    }

    async markAsRead(notificationId) {
        return await Notification.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        );
    }

    async markAllAsRead(recipientId) {
        return await Notification.updateMany(
            { recipientId, read: false },
            { read: true }
        );
    }

    async delete(notificationId) {
        return await Notification.findByIdAndDelete(notificationId);
    }

    async findById(notificationId) {
        return await Notification.findById(notificationId);
    }
}

module.exports = new NotificationRepository();
