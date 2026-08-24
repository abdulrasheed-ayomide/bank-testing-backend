import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as notificationService from '../services/notification.service.js';

export const listMyNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getNotificationsForUser(req.user._id);
  return sendSuccess(res, { notifications });
});

export const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markNotificationRead(req.user._id, req.params.id);
  return sendSuccess(res, { notification });
});
