const express = require('express');
const notificationService = require('../services/NotificationService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
});

router.put('/mark-all-read', authMiddleware, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
