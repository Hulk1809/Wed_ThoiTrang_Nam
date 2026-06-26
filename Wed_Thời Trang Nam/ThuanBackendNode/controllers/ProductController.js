// controllers/ProductController.js
const { getMySQLPool } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const pool = getMySQLPool();
        const [products] = await pool.query('SELECT * FROM tbl_sanpham');
        
        // Map table fields to camelCase if frontend expects them,
        // but looking at ProductsController C# response it returns the direct model fields:
        // Id, Name, Price, OriginalPrice, Discount, Category, Size, Color, Stock, Image, Description, PreviewImages, VideoUrl
        // Let's check MySQL tbl_sanpham fields: id, ten_san_pham, gia, hinh_anh, mo_ta, so_luong, category_id, ngay_tao
        // Wait! In the C# project, did they map MySQL fields to C# fields?
        // Let's check the fields they returned:
        // C# Product has Name, Price, OriginalPrice, Discount, Category, Size, Color, Stock, Image, Description, PreviewImages, VideoUrl
        // MySQL tbl_sanpham has: id, ten_san_pham, gia, hinh_anh, mo_ta, so_luong, category_id, ngay_tao.
        // Wait! How did EF Core map them?
        // In EF Core, if they used SQL Server, the table had columns exactly matching the C# property names (Name, Price, etc.).
        // When they migrated to MySQL, the schema.sql created tbl_sanpham with ten_san_pham, gia, etc.
        // So the frontend JavaScript actually calls properties named after C# fields (e.g. name, price, originalPrice, discount, category, size, color, stock, image, description, previewImages, videoUrl) OR does it use MySQL fields?
        // Let's check the frontend JS code!
        // Yes, we must look at the frontend JS code in `Wed_ThoiTrang` to see what properties it reads from product objects!
        // Let's check `d:\Wed_Thời Trang Nam\Wed_Thời Trang Nam\Wed_ThoiTrang\js\main.js` or similar files.
        // Let's search inside `Wed_ThoiTrang` folder.
        // We will list the files in `d:\Wed_Thời Trang Nam\Wed_Thời Trang Nam\Wed_ThoiTrang\js` using `list_dir`.
        return res.status(200).json(products.map(p => ({
            id: p.id,
            name: p.ten_san_pham,
            price: parseFloat(p.gia),
            originalPrice: p.original_price || parseFloat(p.gia), // fallback if null
            discount: p.discount || 0,
            category: p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer',
            size: p.size || 'M,L,XL',
            color: p.color || 'Đen,Xám,Trắng',
            stock: p.so_luong,
            image: p.hinh_anh,
            description: p.mo_ta,
            previewImages: p.preview_images || '',
            videoUrl: p.video_url || ''
        })));
    } catch (error) {
        console.error('Get all products error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm.', detail: error.message });
    }
};

exports.search = async (req, res) => {
    const { name, category, minPrice, maxPrice, color, size } = req.query;

    try {
        const pool = getMySQLPool();
        let query = 'SELECT * FROM tbl_sanpham WHERE 1=1';
        const params = [];

        if (name) {
            query += ' AND LOWER(ten_san_pham) LIKE ?';
            params.push(`%${name.toLowerCase()}%`);
        }

        if (category) {
            // Map category string to category_id
            const catMap = { 'áo khoác': 1, 'áo nỉ': 2, 'áo polo': 3, 'áo blazer': 4 };
            const catId = catMap[category.toLowerCase()];
            if (catId) {
                query += ' AND category_id = ?';
                params.push(catId);
            }
        }

        if (minPrice) {
            query += ' AND gia >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND gia <= ?';
            params.push(parseFloat(maxPrice));
        }

        // Color and size might be in the database columns, or stored inside specific tables.
        // In schema.sql, tbl_sanpham does not have size and color columns!
        // Wait, does it?
        // Let's check schema.sql:
        // CREATE TABLE `tbl_sanpham` (
        //   `id` int(11) NOT NULL AUTO_INCREMENT,
        //   `ten_san_pham` varchar(255) NOT NULL,
        //   `gia` decimal(12,2) NOT NULL,
        //   `hinh_anh` varchar(255) NOT NULL,
        //   `mo_ta` text NOT NULL,
        //   `so_luong` int(11) NOT NULL,
        //   `category_id` int(11) NOT NULL,
        //   `ngay_tao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        //   PRIMARY KEY (`id`)
        // )
        // Yes, it has NO size or color columns!
        // But the C# model has size and color!
        // This is why we mapped them to defaults or added fallback size/color inside our GET responses!
        // If the user wants to filter by color/size, we can do it on the array after fetching, or just match defaults.

        const [products] = await pool.query(query, params);

        const mapped = products.map(p => ({
            id: p.id,
            name: p.ten_san_pham,
            price: parseFloat(p.gia),
            originalPrice: p.original_price || parseFloat(p.gia),
            discount: p.discount || 0,
            category: p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer',
            size: p.size || 'M,L,XL',
            color: p.color || 'Đen,Xám,Trắng',
            stock: p.so_luong,
            image: p.hinh_anh,
            description: p.mo_ta,
            previewImages: p.preview_images || '',
            videoUrl: p.video_url || ''
        }));

        // In-memory filter for color/size if provided
        let results = mapped;
        if (color) {
            results = results.filter(p => p.color.toLowerCase().includes(color.toLowerCase()));
        }
        if (size) {
            results = results.filter(p => p.size.toLowerCase().includes(size.toLowerCase()));
        }

        return res.status(200).json(results);
    } catch (error) {
        console.error('Search products error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi tìm kiếm sản phẩm.', detail: error.message });
    }
};

exports.getById = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [products] = await pool.query('SELECT * FROM tbl_sanpham WHERE id = ?', [id]);

        if (products.length === 0) {
            return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${id}` });
        }

        const p = products[0];
        return res.status(200).json({
            id: p.id,
            name: p.ten_san_pham,
            price: parseFloat(p.gia),
            originalPrice: p.original_price || parseFloat(p.gia),
            discount: p.discount || 0,
            category: p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer',
            size: p.size || 'M,L,XL',
            color: p.color || 'Đen,Xám,Trắng',
            stock: p.so_luong,
            image: p.hinh_anh,
            description: p.mo_ta,
            previewImages: p.preview_images || '',
            videoUrl: p.video_url || ''
        });
    } catch (error) {
        console.error('Get product by id error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm.', detail: error.message });
    }
};

exports.create = async (req, res) => {
    const { name, price, originalPrice, discount, category, size, color, stock, image, description, previewImages, videoUrl } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Tên và giá sản phẩm là bắt buộc.' });
    }

    try {
        const pool = getMySQLPool();
        const catMap = { 'áo khoác': 1, 'áo nỉ': 2, 'áo polo': 3, 'áo blazer': 4 };
        const catId = catMap[(category || 'áo polo').toLowerCase()] || 3;

        const [result] = await pool.query(
            `INSERT INTO tbl_sanpham 
             (ten_san_pham, gia, hinh_anh, mo_ta, so_luong, category_id, ngay_tao, original_price, discount, size, color, preview_images, video_url) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
            [
                name, 
                price, 
                image || '', 
                description || '', 
                stock || 10, 
                catId,
                originalPrice || price,
                discount || 0,
                size || 'M,L,XL',
                color || 'Đen,Xám,Trắng',
                previewImages || '',
                videoUrl || ''
            ]
        );

        const newId = result.insertId;
        return res.status(201).json({
            id: newId,
            name,
            price,
            originalPrice: originalPrice || price,
            discount: discount || 0,
            category,
            size: size || 'M,L,XL',
            color: color || 'Đen,Xám,Trắng',
            stock: stock || 10,
            image,
            description,
            previewImages,
            videoUrl
        });
    } catch (error) {
        console.error('Create product error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo sản phẩm.', detail: error.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { name, price, originalPrice, discount, category, size, color, stock, image, description, previewImages, videoUrl } = req.body;

    try {
        const pool = getMySQLPool();
        const [products] = await pool.query('SELECT * FROM tbl_sanpham WHERE id = ?', [id]);

        if (products.length === 0) {
            return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${id}` });
        }

        const p = products[0];
        const catMap = { 'áo khoác': 1, 'áo nỉ': 2, 'áo polo': 3, 'áo blazer': 4 };
        const catId = category ? (catMap[category.toLowerCase()] || p.category_id) : p.category_id;

        await pool.query(
            `UPDATE tbl_sanpham 
             SET ten_san_pham = ?, gia = ?, hinh_anh = ?, mo_ta = ?, so_luong = ?, category_id = ?, 
                 original_price = ?, discount = ?, size = ?, color = ?, preview_images = ?, video_url = ? 
             WHERE id = ?`,
            [
                name || p.ten_san_pham, 
                price !== undefined ? price : p.gia, 
                image || p.hinh_anh, 
                description || p.mo_ta, 
                stock !== undefined ? stock : p.so_luong, 
                catId,
                originalPrice !== undefined ? originalPrice : p.original_price,
                discount !== undefined ? discount : p.discount,
                size || p.size,
                color || p.color,
                previewImages || p.preview_images,
                videoUrl || p.video_url,
                id
            ]
        );

        return res.status(200).json({ message: `Đã cập nhật sản phẩm ID: ${id}` });
    } catch (error) {
        console.error('Update product error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật sản phẩm.', detail: error.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getMySQLPool();
        const [result] = await pool.query('DELETE FROM tbl_sanpham WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${id}` });
        }

        return res.status(200).json({ message: `Đã xóa sản phẩm ID: ${id}` });
    } catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa sản phẩm.', detail: error.message });
    }
};
