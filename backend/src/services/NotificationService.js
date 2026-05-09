const NotificationRepository = require('../repositories/NotificationRepository');
const UserRepository = require('../repositories/UserRepository');

class NotificationService {
  static async createNotification(data) {
    return await NotificationRepository.create(data);
  }

  static async sendBookingConfirmation(booking) {
    return await NotificationRepository.create({
      recipientId: booking.userId._id || booking.userId,
      type: 'booking_confirmed',
      subject: 'Booking Confirmed',
      message: `Your booking for ${booking.venueId?.name || 'the venue'} on ${new Date(booking.startTime).toLocaleDateString()} has been confirmed.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async sendPaymentRequiredNotification(booking) {
    return await NotificationRepository.create({
      recipientId: booking.userId._id || booking.userId,
      type: 'booking_confirmed', // Using enum type from model
      subject: 'Payment Required',
      message: `Your booking for ${booking.venueId?.name || 'the venue'} has been approved. Please complete the payment to confirm your booking.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async sendRejectionNotification(booking) {
    return await NotificationRepository.create({
      recipientId: booking.userId._id || booking.userId,
      type: 'priority_rejected', // Using enum type from model
      subject: 'Booking Rejected',
      message: `Your booking request for ${booking.venueId?.name || 'the venue'} has been rejected. Reason: ${booking.rejectionReason || 'No reason provided'}.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async sendCancellationNotification(booking) {
    return await NotificationRepository.create({
      recipientId: booking.userId._id || booking.userId,
      type: 'booking_cancelled',
      subject: 'Booking Cancelled',
      message: `Your booking for ${booking.venueId?.name || 'the venue'} has been cancelled.`,
      relatedEntityId: booking._id,
      read: false
    });
  }

  static async notifyAdminsOfBookingRequest(booking) {
    const admins = await UserRepository.findByRole('admin');
    const superAdmins = await UserRepository.findByRole('super_admin');
    const allAdmins = [...admins, ...superAdmins];

    const notifications = allAdmins.map(admin => ({
      recipientId: admin._id,
      type: 'system',
      subject: 'New Booking Request',
      message: `A new booking request has been submitted for ${booking.venueId?.name || 'a venue'}.`,
      relatedEntityId: booking._id,
      read: false
    }));

    for (const notification of notifications) {
      await NotificationRepository.create(notification);
    }
  }

  static async getUserNotifications(userId) {
    return await NotificationRepository.findByRecipient(userId);
  }

  static async markAsRead(notificationId) {
    return await NotificationRepository.markAsRead(notificationId);
  }

  static async markAllAsRead(userId) {
    return await NotificationRepository.markAllAsRead(userId);
  }
}

module.exports = NotificationService;
