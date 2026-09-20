const notificationService = require('../services/notificationService');

class NotificationController {
  async list(req, res, next) {
    try {
      const data = await notificationService.list(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async markRead(req, res, next) {
    try {
      const data = await notificationService.markRead(req.params.id, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async markAllRead(req, res, next) {
    try {
      const data = await notificationService.markAllRead(req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = new NotificationController();
