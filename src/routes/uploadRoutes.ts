import { Router } from 'express';
import multer from 'multer';
import { uploadFile, deleteFile } from '../controllers/uploadController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Use memory storage so we can stream it to our StorageProvider abstraction (S3/Cloudinary/Disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.use(requireAuth);

router.post('/', upload.single('file'), uploadFile);
router.delete('/:key', deleteFile);

// Error handling for Multer
router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || err.message === 'Only images are allowed') {
    res.status(400).json({ error: err.message });
  } else {
    next(err);
  }
});

export default router;
