"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const submissionController_1 = require("../controllers/submissionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// Submissions router
router.get('/', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['CLIPPER']), submissionController_1.getMySubmissions);
router.get('/:id', authMiddleware_1.requireAuth, submissionController_1.getSubmissionById);
router.post('/:id/approve', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), submissionController_1.approveSubmission);
router.post('/:id/reject', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), submissionController_1.rejectSubmission);
router.post('/:id/request-changes', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), submissionController_1.requestChanges);
exports.default = router;
