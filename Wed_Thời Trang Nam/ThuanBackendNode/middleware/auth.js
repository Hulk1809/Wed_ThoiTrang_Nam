// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'DAY_LA_CHIA_KHOA_BI_MAT_CUA_BAN_HAY_GIU_KY_NO_123456789';

// Authentication middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Truy cập bị từ chối. Không tìm thấy token.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains { nameid, email, role }
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

// Authorization middleware
const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Chưa xác thực.' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
