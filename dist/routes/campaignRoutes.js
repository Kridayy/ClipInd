"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const campaignController_1 = require("../controllers/campaignController");
const submissionController_1 = require("../controllers/submissionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Public / Clipper routes (needs login, but any role can view)
router.get('/', authMiddleware_1.requireAuth, campaignController_1.getCampaigns);
router.get('/:id', authMiddleware_1.requireAuth, campaignController_1.getCampaignById);
// Clipper routes
router.post('/:id/submissions', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['CLIPPER']), submissionController_1.createSubmission);
// Business routes
router.post('/', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), campaignController_1.createCampaign);
router.get('/business/me', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), campaignController_1.getMyCampaigns);
router.post('/:id/:action', authMiddleware_1.requireAuth, (0, roleMiddleware_1.requireRole)(['BUSINESS']), campaignController_1.updateCampaignStatus);
exports.default = router;
