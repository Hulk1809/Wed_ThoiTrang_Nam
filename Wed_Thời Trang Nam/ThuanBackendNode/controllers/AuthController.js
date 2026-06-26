// controllers/AuthController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getMySQLPool } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'DAY_LA_CHIA_KHOA_BI_MAT_CUA_BAN_HAY_GIU_KY_NO_123456789';

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    }

    try {
        const pool = getMySQLPool();
        
        // Check if user exists in users table
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email đã được đăng ký.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert into users
        const [result] = await pool.query(
            'INSERT INTO users (ho_ten, email, mat_khau, vai_tro, ngay_tao) VALUES (?, ?, ?, ?, NOW())',
            [name, email, passwordHash, 'user']
        );
        const userId = result.insertId;

        // Sync with tbl_khachhang table for compatibility
        await pool.query(
            'INSERT INTO tbl_khachhang (id, ho_ten, email, mat_khau, vai_tro, ngay_tao, trang_thai) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
            [userId, name, email, passwordHash, 'user', 'hoat_dong']
        );

        return res.status(201).json({ message: 'Đăng ký thành công!', id: userId });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo tài khoản.', detail: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc.' });
    }

    try {
        const pool = getMySQLPool();
        
        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.mat_khau);
        if (!isMatch) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
        }

        // Create JWT Token (matching C# claims: NameIdentifier, Email, Role)
        const token = jwt.sign(
            { 
                nameid: user.id.toString(), // NameIdentifier
                email: user.email,
                role: user.vai_tro
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.id,
                name: user.ho_ten,
                email: user.email,
                role: user.vai_tro
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng nhập.', detail: error.message });
    }
};

exports.profile = async (req, res) => {
    try {
        const userId = req.user.nameid;
        const pool = getMySQLPool();

        const [users] = await pool.query('SELECT id, ho_ten, email, vai_tro FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
        }

        const user = users[0];
        return res.status(200).json({
            id: user.id,
            name: user.ho_ten,
            email: user.email,
            role: user.vai_tro
        });
    } catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin profile.', detail: error.message });
    }
};
