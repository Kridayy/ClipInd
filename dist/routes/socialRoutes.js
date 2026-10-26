"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socialController_1 = require("../controllers/socialController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
router.get('/auth/:platform', socialController_1.getAuthUrl);
router.get('/callback/:platform', socialController_1.handleCallback); // In real OAuth this would not requireAuth via JWT, but via state cookie, however for MVP we assume client calls it with token. Or we can just mock it.
router.get('/accounts', socialController_1.getAccounts);
router.delete('/accounts/:id', socialController_1.disconnectAccount);
exports.default = router;
