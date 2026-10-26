"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
router.get('/', notificationController_1.getNotifications);
router.post('/read-all', notificationController_1.markRead);
router.post('/mark-read', notificationController_1.markRead); // Keep for backwards compatibility
router.post('/:id/read', notificationController_1.markNotificationRead);
exports.default = router;
