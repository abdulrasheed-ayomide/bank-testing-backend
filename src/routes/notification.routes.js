import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', notificationController.listMyNotifications);
router.patch('/:id/read', notificationController.markRead);

export default router;
