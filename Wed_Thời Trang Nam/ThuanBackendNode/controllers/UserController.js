// controllers/UserController.js
const { getMySQLPool } = require('../config/db');

// === 1. GET /api/users (Lấy danh sách tất cả người dùng) ===
exports.getAllUsers = async (req, res) => {
    try {
        const pool = getMySQLPool();
        const [users] = await pool.query(
            'SELECT id, ho_ten as name, email, vai_tro as role, ngay_tao as createdAt FROM users ORDER BY ngay_tao DESC'
        );

        return res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Get all users error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng.', detail: error.message });
    }
};

// === 2. GET /api/users/:id (Lấy chi tiết một người dùng) ===
exports.getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [users] = await pool.query(
            'SELECT id, ho_ten as name, email, vai_tro as role, ngay_tao as createdAt FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        return res.status(200).json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng.', detail: error.message });
    }
};

// === 3. PUT /api/users/:id (Cập nhật thông tin người dùng) ===
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    try {
        const pool = getMySQLPool();
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        const user = users[0];
        const updatedName = name || user.ho_ten;
        let updatedEmail = user.email;

        if (email && email !== user.email) {
            // Check if email is already used
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Email đã được sử dụng.' });
            }
            updatedEmail = email;
        }

        const updatedRole = role || user.vai_tro;

        await pool.query(
            'UPDATE users SET ho_ten = ?, email = ?, vai_tro = ? WHERE id = ?',
            [updatedName, updatedEmail, updatedRole, id]
        );

        // Sync with tbl_khachhang
        await pool.query(
            'UPDATE tbl_khachhang SET ho_ten = ?, email = ?, vai_tro = ? WHERE id = ?',
            [updatedName, updatedEmail, updatedRole === 'admin' ? 'admin' : 'user', id]
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thành công.',
            data: { id: parseInt(id), name: updatedName, email: updatedEmail, role: updatedRole }
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật người dùng.', detail: error.message });
    }
};

// === 4. DELETE /api/users/:id (Xóa người dùng) ===
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        // Also delete from tbl_khachhang
        await pool.query('DELETE FROM tbl_khachhang WHERE id = ?', [id]);

        return res.status(200).json({ success: true, message: 'Xóa người dùng thành công.' });
    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xóa người dùng.', detail: error.message });
    }
};

// === 5. GET /api/users/role/:role (Lấy người dùng theo role) ===
exports.getUsersByRole = async (req, res) => {
    const { role } = req.params;

    try {
        const pool = getMySQLPool();
        const [users] = await pool.query(
            'SELECT id, ho_ten as name, email, vai_tro as role, ngay_tao as createdAt FROM users WHERE vai_tro = ?',
            [role]
        );

        return res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Get users by role error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi lấy người dùng theo vai trò.', detail: error.message });
    }
};

// === 6. PUT /api/users/:id/role (Thay đổi role người dùng) ===
exports.changeUserRole = async (req, res) => {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!newRole) {
        return res.status(400).json({ success: false, message: 'Role không được bỏ trống.' });
    }

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query('UPDATE users SET vai_tro = ? WHERE id = ?', [newRole, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        // Sync with tbl_khachhang
        await pool.query('UPDATE tbl_khachhang SET vai_tro = ? WHERE id = ?', [newRole === 'admin' ? 'admin' : 'user', id]);

        // Get updated user data
        const [users] = await pool.query('SELECT id, ho_ten as name, email, vai_tro as role FROM users WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: `Đã thay đổi role thành '${newRole}'.`,
            data: users[0]
        });
    } catch (error) {
        console.error('Change user role error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi thay đổi vai trò người dùng.', detail: error.message });
    }
};
