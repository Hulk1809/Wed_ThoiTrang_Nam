// controllers/OrderController.js
const { getMySQLPool } = require('../config/db');

exports.placeOrder = async (req, res) => {
    const { shippingAddress, phoneNumber } = req.body;
    const userId = req.user.nameid; // Auth middleware sets this

    if (!shippingAddress) {
        return res.status(400).json({ error: 'Địa chỉ giao hàng là bắt buộc.' });
    }

    const pool = getMySQLPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Get cart items and calculate total amount
        const [cartItems] = await conn.query(
            `SELECT g.product_id as productId, g.so_luong as quantity, s.ten_san_pham as name, s.gia as price, s.so_luong as stock 
             FROM tbl_giohang g 
             JOIN tbl_sanpham s ON g.product_id = s.id 
             WHERE g.user_id = ?`,
            [userId]
        );

        if (cartItems.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Giỏ hàng của bạn đang trống.' });
        }

        // Check stock levels first
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                await conn.rollback();
                return res.status(400).json({ error: `Sản phẩm "${item.name}" không đủ số lượng trong kho.` });
            }
        }

        let totalAmount = 0;
        cartItems.forEach(item => {
            totalAmount += parseFloat(item.price) * item.quantity;
        });

        // 2. Insert order
        const [orderResult] = await conn.query(
            `INSERT INTO tbl_donhang (user_id, tong_tien, trang_thai, dia_chi_giao_hang, ngay_dat) 
             VALUES (?, ?, 'cho_xac_nhan', ?, NOW())`,
            [userId, totalAmount, shippingAddress]
        );
        const orderId = orderResult.insertId;

        // 3. Insert order items & decrease stock
        for (const item of cartItems) {
            // Insert item
            await conn.query(
                `INSERT INTO tbl_chitietdonhang (donhang_id, product_id, so_luong, don_gia) 
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.productId, item.quantity, item.price]
            );

            // Decrease stock
            await conn.query(
                `UPDATE tbl_sanpham SET so_luong = so_luong - ? WHERE id = ?`,
                [item.quantity, item.productId]
            );
        }

        // 4. Clear cart
        await conn.query(`DELETE FROM tbl_giohang WHERE user_id = ?`, [userId]);

        const createdOrder = {
            id: orderId,
            orderId: orderId,
            userId: parseInt(userId),
            totalAmount: parseFloat(totalAmount),
            orderStatus: 'Pending',
            shippingAddress: shippingAddress,
            orderDate: new Date(),
            items: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: parseFloat(item.price)
            }))
        };

        await conn.commit();
        return res.status(201).json(createdOrder);
    } catch (error) {
        await conn.rollback();
        console.error('Place order error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi đặt hàng.', detail: error.message });
    } finally {
        conn.release();
    }
};

exports.getOrderHistory = async (req, res) => {
    const userId = req.user.nameid;

    try {
        const pool = getMySQLPool();
        const [orders] = await pool.query(
            `SELECT id, tong_tien as totalAmount, trang_thai as orderStatus, dia_chi_giao_hang as shippingAddress, ngay_dat as orderDate 
             FROM tbl_donhang 
             WHERE user_id = ? 
             ORDER BY ngay_dat DESC`,
            [userId]
        );

        const mapped = orders.map(o => ({
            id: o.id,
            userId: userId,
            totalAmount: parseFloat(o.totalAmount),
            orderStatus: o.orderStatus === 'cho_xac_nhan' ? 'Pending' : o.orderStatus === 'hoan_thanh' ? 'Completed' : 'Cancelled',
            shippingAddress: o.shippingAddress,
            orderDate: o.orderDate
        }));

        return res.status(200).json(mapped);
    } catch (error) {
        console.error('Get order history error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy lịch sử đơn hàng.', detail: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.nameid;
    const userRole = req.user.role;

    try {
        const pool = getMySQLPool();
        const [orders] = await pool.query(
            `SELECT id, user_id as userId, tong_tien as totalAmount, trang_thai as orderStatus, dia_chi_giao_hang as shippingAddress, ngay_dat as orderDate 
             FROM tbl_donhang 
             WHERE id = ?`,
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: `Không tìm thấy đơn hàng ID: ${id}` });
        }

        const order = orders[0];

        // Authorization check: User can only view their own orders. Admin can view all.
        if (order.userId !== parseInt(userId) && userRole !== 'admin') {
            return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng này.' });
        }

        // Fetch order items
        const [items] = await pool.query(
            `SELECT c.id, c.product_id as productId, c.so_luong as quantity, c.don_gia as price, 
                    s.ten_san_pham as name, s.hinh_anh as image 
             FROM tbl_chitietdonhang c 
             JOIN tbl_sanpham s ON c.product_id = s.id 
             WHERE c.donhang_id = ?`,
            [id]
        );

        return res.status(200).json({
            id: order.id,
            userId: order.userId,
            totalAmount: parseFloat(order.totalAmount),
            orderStatus: order.orderStatus === 'cho_xac_nhan' ? 'Pending' : order.orderStatus === 'hoan_thanh' ? 'Completed' : 'Cancelled',
            shippingAddress: order.shippingAddress,
            orderDate: order.orderDate,
            items: items.map(item => ({
                id: item.id,
                productId: item.productId,
                quantity: item.quantity,
                price: parseFloat(item.price),
                product: {
                    id: item.productId,
                    name: item.name,
                    image: item.image
                }
            }))
        });
    } catch (error) {
        console.error('Get order by id error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy chi tiết đơn hàng.', detail: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const pool = getMySQLPool();
        const [orders] = await pool.query(
            `SELECT o.id, o.user_id as userId, u.ho_ten as userName, u.email as userEmail,
                    o.tong_tien as totalAmount, o.trang_thai as orderStatus, 
                    o.dia_chi_giao_hang as shippingAddress, o.ngay_dat as orderDate 
             FROM tbl_donhang o
             LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.ngay_dat DESC`
        );

        const mapped = orders.map(o => ({
            id: o.id,
            userId: o.userId,
            userName: o.userName || 'Anonymous',
            userEmail: o.userEmail || '',
            totalAmount: parseFloat(o.totalAmount),
            orderStatus: o.orderStatus === 'cho_xac_nhan' ? 'Pending' : o.orderStatus === 'hoan_thanh' ? 'Completed' : 'Cancelled',
            shippingAddress: o.shippingAddress,
            orderDate: o.orderDate
        }));

        return res.status(200).json(mapped);
    } catch (error) {
        console.error('Get all orders error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng.', detail: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const status = req.body.status || req.body.NewStatus || req.body.newStatus;

    if (!status) {
        return res.status(400).json({ error: 'Status/NewStatus là bắt buộc.' });
    }

    const statusMap = { 'Pending': 'cho_xac_nhan', 'Completed': 'hoan_thanh', 'Cancelled': 'da_huy' };
    const dbStatus = statusMap[status];

    if (!dbStatus) {
        return res.status(400).json({ error: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query(
            'UPDATE tbl_donhang SET trang_thai = ? WHERE id = ?',
            [dbStatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Không tìm thấy đơn hàng ID: ${id}` });
        }

        // Return C# compatible response structure
        const [orderRows] = await pool.query('SELECT * FROM tbl_donhang WHERE id = ?', [id]);
        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công.',
            data: orderRows[0] ? {
                id: orderRows[0].id,
                userId: orderRows[0].user_id,
                totalAmount: parseFloat(orderRows[0].tong_tien),
                orderStatus: status,
                shippingAddress: orderRows[0].dia_chi_giao_hang,
                orderDate: orderRows[0].ngay_dat
            } : null
        });
    } catch (error) {
        console.error('Update order status error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng.', detail: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    const { id } = req.params;

    const pool = getMySQLPool();
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Check if order exists
        const [orders] = await conn.query('SELECT id FROM tbl_donhang WHERE id = ?', [id]);
        if (orders.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });
        }

        // Get items to restore stock
        const [items] = await conn.query(
            'SELECT product_id as productId, so_luong as quantity FROM tbl_chitietdonhang WHERE donhang_id = ?',
            [id]
        );

        // Restore stock
        for (const item of items) {
            await conn.query(
                'UPDATE tbl_sanpham SET so_luong = so_luong + ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }

        // Delete chitietdonhang first
        await conn.query('DELETE FROM tbl_chitietdonhang WHERE donhang_id = ?', [id]);
        // Delete donhang
        await conn.query('DELETE FROM tbl_donhang WHERE id = ?', [id]);

        await conn.commit();
        return res.status(200).json({ success: true, message: 'Xóa đơn hàng thành công.' });
    } catch (error) {
        await conn.rollback();
        console.error('Delete order error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng.', detail: error.message });
    } finally {
        conn.release();
    }
};

exports.getOrdersByStatus = async (req, res) => {
    const { status } = req.params;

    const statusMap = {
        'Pending': 'cho_xac_nhan',
        'Completed': 'hoan_thanh',
        'Cancelled': 'da_huy',
        'cho_xac_nhan': 'cho_xac_nhan',
        'hoan_thanh': 'hoan_thanh',
        'da_huy': 'da_huy'
    };
    const dbStatus = statusMap[status];

    if (!dbStatus) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    }

    try {
        const pool = getMySQLPool();
        const [orders] = await pool.query(
            `SELECT o.id, o.user_id as userId, u.ho_ten as userName, u.email as userEmail,
                    o.tong_tien as totalAmount, o.trang_thai as orderStatus, 
                    o.dia_chi_giao_hang as shippingAddress, o.ngay_dat as orderDate 
             FROM tbl_donhang o
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.trang_thai = ?
             ORDER BY o.ngay_dat DESC`,
            [dbStatus]
        );

        const mapped = orders.map(o => ({
            id: o.id,
            userId: o.userId,
            userName: o.userName || 'Anonymous',
            userEmail: o.userEmail || '',
            totalAmount: parseFloat(o.totalAmount),
            orderStatus: o.orderStatus === 'cho_xac_nhan' ? 'Pending' : o.orderStatus === 'hoan_thanh' ? 'Completed' : 'Cancelled',
            shippingAddress: o.shippingAddress,
            orderDate: o.orderDate
        }));

        return res.status(200).json({
            success: true,
            data: mapped,
            count: mapped.length
        });
    } catch (error) {
        console.error('Get orders by status error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng.', detail: error.message });
    }
};
