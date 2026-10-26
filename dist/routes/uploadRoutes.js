"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Use memory storage so we can stream it to our StorageProvider abstraction (S3/Cloudinary/Disk)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only images are allowed'));
        }
    }
});
router.use(authMiddleware_1.requireAuth);
router.post('/', upload.single('file'), uploadController_1.uploadFile);
router.delete('/:key', uploadController_1.deleteFile);
// Error handling for Multer
router.use((err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError || err.message === 'Only images are allowed') {
        res.status(400).json({ error: err.message });
    }
    else {
        next(err);
    }
});
exports.default = router;
