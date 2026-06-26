// controllers/UploadController.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getMySQLPool } = require('../config/db');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

// Max size 100MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

const getFileType = (ext) => {
    switch (ext) {
        case '.mp4':
        case '.webm':
        case '.avi':
        case '.mov':
            return 'video';
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.webp':
            return 'image';
        case '.pdf':
        case '.doc':
        case '.docx':
            return 'document';
        default:
            return 'other';
    }
};

const getContentType = (ext) => {
    switch (ext) {
        case '.mp4': return 'video/mp4';
        case '.webm': return 'video/webm';
        case '.avi': return 'video/avi';
        case '.mov': return 'video/quicktime';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.gif': return 'image/gif';
        case '.pdf': return 'application/pdf';
        case '.doc': return 'application/msword';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        default: return 'application/octet-stream';
    }
};

// Helper function to save file details into MySQL db
async function saveUploadedFile(file, userId, description, req) {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileType = getFileType(ext);
    const relativeUrl = `/uploads/${file.filename}`;

    const pool = getMySQLPool();
    const [result] = await pool.query(
        `INSERT INTO UploadedFiles (file_name, file_url, file_type, file_size_bytes, user_id, description, uploaded_at, download_count)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [file.originalname, relativeUrl, fileType, file.size, userId || null, description || '']
    );

    const publicUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    return {
        message: 'Upload thành công',
        id: result.insertId,
        fileName: file.originalname,
        fileUrl: relativeUrl,
        publicUrl: publicUrl,
        fileType: fileType,
        fileSizeBytes: file.size
    };
}

// POST /api/upload - Single file upload
exports.uploadSingle = [
    upload.single('file'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'File không được để trống' });
        }

        const { userId, description } = req.body;

        try {
            const result = await saveUploadedFile(req.file, userId, description, req);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Single upload database error:', error);
            // Cleanup uploaded file on error
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {}
            return res.status(500).json({ message: `Lỗi upload: ${error.message}` });
        }
    }
];

// POST /api/upload/multiple - Multiple files upload
exports.uploadMultiple = [
    upload.array('files'),
    async (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Chưa chọn file' });
        }

        const { description } = req.body;
        const results = [];

        try {
            for (const file of req.files) {
                const singleResult = await saveUploadedFile(file, null, description, req);
                results.push(singleResult);
            }
            return res.status(200).json({
                message: `Upload ${results.length} file thành công`,
                data: results
            });
        } catch (error) {
            console.error('Multiple upload database error:', error);
            // Cleanup files
            if (req.files) {
                req.files.forEach(f => {
                    try {
                        fs.unlinkSync(f.path);
                    } catch (err) {}
                });
            }
            return res.status(500).json({ message: `Lỗi upload: ${error.message}` });
        }
    }
];

// GET /api/upload/:id/download - Download file
exports.downloadFile = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [files] = await pool.query('SELECT * FROM UploadedFiles WHERE id = ?', [id]);

        if (files.length === 0) {
            return res.status(404).json({ message: 'File không tìm thấy' });
        }

        const file = files[0];
        const filePath = path.join(__dirname, '..', file.file_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File không tồn tại trên server' });
        }

        // Increment download count
        await pool.query('UPDATE UploadedFiles SET download_count = download_count + 1 WHERE id = ?', [id]);

        const ext = path.extname(file.file_name).toLowerCase();
        res.setHeader('Content-Type', getContentType(ext));
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
        
        return res.sendFile(filePath);
    } catch (error) {
        console.error('Download file error:', error);
        return res.status(500).json({ message: `Lỗi tải file: ${error.message}` });
    }
};

// GET /api/upload - Get all uploaded files list
exports.getUploadedFiles = async (req, res) => {
    const { userId, fileType } = req.query;

    try {
        const pool = getMySQLPool();
        let query = 'SELECT id, file_name as fileName, file_url as fileUrl, file_type as fileType, file_size_bytes as fileSizeBytes, user_id as userId, description, uploaded_at as uploadedAt, download_count as downloadCount FROM UploadedFiles WHERE 1=1';
        const params = [];

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        if (fileType) {
            query += ' AND file_type = ?';
            params.push(fileType);
        }

        query += ' ORDER BY uploaded_at DESC';

        const [files] = await pool.query(query, params);
        return res.status(200).json({ data: files, count: files.length });
    } catch (error) {
        console.error('Get uploaded files error:', error);
        return res.status(500).json({ message: `Lỗi lấy danh sách file: ${error.message}` });
    }
};

// DELETE /api/upload/:id - Delete file
exports.deleteFile = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [files] = await pool.query('SELECT * FROM UploadedFiles WHERE id = ?', [id]);

        if (files.length === 0) {
            return res.status(404).json({ message: 'File không tìm thấy' });
        }

        const file = files[0];
        const filePath = path.join(__dirname, '..', file.file_url);

        // Delete from disk
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.warn(`Could not delete physical file at ${filePath}:`, err);
            }
        }

        // Delete from DB
        await pool.query('DELETE FROM UploadedFiles WHERE id = ?', [id]);

        return res.status(200).json({ message: 'Xóa file thành công' });
    } catch (error) {
        console.error('Delete file error:', error);
        return res.status(500).json({ message: `Lỗi xóa file: ${error.message}` });
    }
};
