// controllers/CartController.js
const { getMySQLPool } = require('../config/db');

exports.getCart = async (req, res) => {
    const userId = req.query.userId || (req.user ? req.user.nameid : null);
    
    if (!userId) {
        return res.status(400).json({ error: 'UserId là bắt buộc.' });
    }

    try {
        const pool = getMySQLPool();
        const [cartItems] = await pool.query(
            `SELECT g.id, g.product_id as productId, g.so_luong as quantity, 
                    s.ten_san_pham as name, s.gia as price, s.hinh_anh as image, 
                    s.so_luong as stock
             FROM tbl_giohang g 
             JOIN tbl_sanpham s ON g.product_id = s.id 
             WHERE g.user_id = ?`,
            [userId]
        );

        // Convert decimal prices to float
        const mapped = cartItems.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            product: {
                id: item.productId,
                name: item.name,
                price: parseFloat(item.price),
                image: item.image,
                stock: item.stock
            }
        }));

        return res.status(200).json({
            userId: parseInt(userId),
            items: mapped
        });
    } catch (error) {
        console.error('Get cart error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy giỏ hàng.', detail: error.message });
    }
};

exports.addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.body.userId || (req.user ? req.user.nameid : null);

    if (!userId || !productId) {
        return res.status(400).json({ error: 'UserId và ProductId là bắt buộc.' });
    }

    const qty = quantity ? parseInt(quantity) : 1;

    try {
        const pool = getMySQLPool();

        // Check if product exists
        const [products] = await pool.query('SELECT id, so_luong FROM tbl_sanpham WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
        }

        // Check if item already in cart
        const [existing] = await pool.query(
            'SELECT id, so_luong FROM tbl_giohang WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (existing.length > 0) {
            // Update quantity
            const newQty = existing[0].so_luong + qty;
            if (newQty <= 0) {
                // If quantity drops to 0 or below, remove it
                await pool.query('DELETE FROM tbl_giohang WHERE id = ?', [existing[0].id]);
            } else {
                await pool.query(
                    'UPDATE tbl_giohang SET so_luong = ? WHERE id = ?',
                    [newQty, existing[0].id]
                );
            }
        } else if (qty > 0) {
            // Insert new item
            await pool.query(
                'INSERT INTO tbl_giohang (user_id, product_id, so_luong, created_at) VALUES (?, ?, ?, NOW())',
                [userId, productId, qty]
            );
        }

        // Return updated cart
        return await exports.getCart(req, res);
    } catch (error) {
        console.error('Add to cart error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.', detail: error.message });
    }
};

exports.sync = async (req, res) => {
    const userId = req.body.userId || (req.user ? req.user.nameid : null);
    if (!userId) {
        return res.status(400).json({ error: 'UserId là bắt buộc.' });
    }

    const items = req.body.items || req.body.Items || [];

    try {
        const pool = getMySQLPool();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            
            // Delete old items
            await conn.query('DELETE FROM tbl_giohang WHERE user_id = ?', [userId]);
            
            // Insert new items
            for (const incoming of items) {
                const productId = incoming.productId || incoming.ProductId;
                const quantity = incoming.quantity || incoming.Quantity || 0;
                if (quantity < 1 || !productId) continue;
                
                // Verify product exists
                const [products] = await conn.query('SELECT id FROM tbl_sanpham WHERE id = ?', [productId]);
                if (products.length === 0) continue;
                
                await conn.query(
                    'INSERT INTO tbl_giohang (user_id, product_id, so_luong, created_at) VALUES (?, ?, ?, NOW())',
                    [userId, productId, quantity]
                );
            }
            
            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        // Return updated cart
        return await exports.getCart(req, res);
    } catch (error) {
        console.error('Sync cart error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi đồng bộ giỏ hàng.', detail: error.message });
    }
};

exports.updateQuantity = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity <= 0) {
        return res.status(400).json({ error: 'Số lượng phải lớn hơn 0.' });
    }

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query(
            'UPDATE tbl_giohang SET so_luong = ? WHERE id = ?',
            [parseInt(quantity), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy item trong giỏ hàng.' });
        }

        return res.status(200).json({ message: 'Đã cập nhật số lượng.' });
    } catch (error) {
        console.error('Update cart item error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật số lượng.', detail: error.message });
    }
};

exports.updateQuantityByProductId = async (req, res) => {
    const { productId } = req.params;
    const userId = req.body.userId || (req.user ? req.user.nameid : null);
    const quantity = req.body.quantity || req.body.Quantity;

    if (!userId) {
        return res.status(400).json({ error: 'UserId là bắt buộc.' });
    }
    if (quantity === undefined || quantity < 1) {
        return res.status(400).json({ error: 'Số lượng phải >= 1.' });
    }

    try {
        const pool = getMySQLPool();
        const [existing] = await pool.query(
            'SELECT id FROM tbl_giohang WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy item trong giỏ hàng.' });
        }

        await pool.query(
            'UPDATE tbl_giohang SET so_luong = ? WHERE id = ?',
            [parseInt(quantity), existing[0].id]
        );

        return res.status(200).json({ productId: parseInt(productId), quantity: parseInt(quantity) });
    } catch (error) {
        console.error('Update quantity by product ID error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật số lượng.', detail: error.message });
    }
};

exports.removeItem = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query('DELETE FROM tbl_giohang WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy item trong giỏ hàng.' });
        }

        return res.status(200).json({ message: 'Đã xóa item khỏi giỏ hàng.' });
    } catch (error) {
        console.error('Remove cart item error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa item.', detail: error.message });
    }
};

exports.clearCart = async (req, res) => {
    const userId = req.query.userId || (req.user ? req.user.nameid : null);

    if (!userId) {
        return res.status(400).json({ error: 'UserId là bắt buộc.' });
    }

    try {
        const pool = getMySQLPool();
        await pool.query('DELETE FROM tbl_giohang WHERE user_id = ?', [userId]);
        return res.status(200).json({ message: 'Đã xóa toàn bộ giỏ hàng.' });
    } catch (error) {
        console.error('Clear cart error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa giỏ hàng.', detail: error.message });
    }
};
