// routes/upload.js
const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/UploadController');

router.post('/', UploadController.uploadSingle);
router.post('/multiple', UploadController.uploadMultiple);
router.get('/:id/download', UploadController.downloadFile);
router.get('/', UploadController.getUploadedFiles);
router.delete('/:id', UploadController.deleteFile);

module.exports = router;
