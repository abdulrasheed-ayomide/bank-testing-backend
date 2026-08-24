import Notification from '../models/Notification.js';
import AppError from '../utils/AppError.js';

export async function createNotification({ user, title, body, relatedTransaction = null }) {
  return Notification.create({ user, title, body, relatedTransaction });
}

export async function getNotificationsForUser(userId) {
  return Notification.find({ user: userId }).sort({ createdAt: -1 });
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found.', 404);
  return notification;
}
