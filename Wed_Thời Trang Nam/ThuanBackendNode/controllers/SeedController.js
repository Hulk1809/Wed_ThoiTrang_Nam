// controllers/SeedController.js
const { exec } = require('child_process');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getMySQLPool } = require('../config/db');

// POST /api/seed/admin - Ensure admin user exists
exports.ensureAdminUser = async (req, res) => {
    const email = 'admin@khacthuan.com';
    try {
        const pool = getMySQLPool();
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('demo123', salt);
            
            const [result] = await pool.query(
                'INSERT INTO users (ho_ten, email, mat_khau, vai_tro, ngay_tao) VALUES (?, ?, ?, ?, NOW())',
                ['Shop Admin', email, passwordHash, 'admin']
            );

            // Sync with tbl_khachhang
            await pool.query(
                'INSERT INTO tbl_khachhang (id, ho_ten, email, mat_khau, vai_tro, ngay_tao, trang_thai) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                [result.insertId, 'Shop Admin', email, passwordHash, 'admin', 'hoat_dong']
            );

            return res.status(200).json({ message: 'Đã tạo tài khoản admin', email, password: 'demo123', userId: result.insertId });
        }

        const user = users[0];
        if (user.vai_tro !== 'admin') {
            await pool.query("UPDATE users SET vai_tro = 'admin' WHERE id = ?", [user.id]);
            await pool.query("UPDATE tbl_khachhang SET vai_tro = 'admin' WHERE id = ?", [user.id]);
            return res.status(200).json({ message: 'Đã cập nhật quyền admin', email, password: 'demo123', userId: user.id });
        }

        return res.status(200).json({ message: 'Tài khoản admin đã tồn tại', email, password: 'demo123', userId: user.id });
    } catch (error) {
        console.error('Ensure admin error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/seed/demo-accounts
exports.getDemoAccounts = (req, res) => {
    const accounts = [
        { email: 'vip1@khacthuan.com', name: 'VIP Khách Hàng 1', profile: 'VIP / High Engagement' },
        { email: 'vip2@khacthuan.com', name: 'VIP Khách Hàng 2', profile: 'VIP / High Engagement' },
        { email: 'guest1@khacthuan.com', name: 'Regular Khách Hàng 1', profile: 'Regular / Medium Engagement' },
        { email: 'guest2@khacthuan.com', name: 'Regular Khách Hàng 2', profile: 'Regular / Medium Engagement' },
        { email: 'new1@khacthuan.com', name: 'New Khách Hàng 1', profile: 'New / Low Engagement' },
        { email: 'new2@khacthuan.com', name: 'New Khách Hàng 2', profile: 'New / Low Engagement' }
    ];

    return res.status(200).json({
        password: 'demo123',
        message: 'Đăng nhập bằng các tài khoản dưới để thu thập dữ liệu hành vi',
        accounts
    });
};

// POST /api/seed/demo - Run seed.js script
exports.seedDemoData = (req, res) => {
    const seedScript = path.join(__dirname, '..', 'scripts', 'seed.js');
    console.log(`Executing database seed script at ${seedScript}...`);

    exec(`node "${seedScript}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Database seeding failed: ${error.message}`);
            return res.status(500).json({ error: 'Database seeding failed', details: stderr || error.message });
        }
        console.log(`Seeding stdout:\n${stdout}`);
        return res.status(200).json({
            message: 'Database seed completed successfully',
            output: stdout.trim().split('\n')
        });
    });
};
