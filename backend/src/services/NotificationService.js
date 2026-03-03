const NotificationRepository = require('../repositories/NotificationRepository');

class NotificationService {
  static async sendBookingConfirmation(booking) {
    return NotificationRepository.create({
      recipientId: booking.userId,
      type: 'booking_confirmation',
      subject: 'Booking Confirmed',
      message: `Your booking for ${booking.venueId?.name} has been confirmed.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async sendCancellationNotification(booking) {
    return NotificationRepository.create({
      recipientId: booking.userId,
      type: 'cancellation',
      subject: 'Booking Cancelled',
      message: `Your booking for ${booking.venueId?.name} has been cancelled.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async getUserNotifications(userId) {
    return NotificationRepository.findByRecipient(userId);
  }

  static async markAsRead(notificationId) {
    return NotificationRepository.markAsRead(notificationId);
  }
}

module.exports = NotificationService;
