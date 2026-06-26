// scripts/seed.js
global.crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { connectMySQL, connectMongoDB, getMySQLPool } = require('../config/db');
const UserBehavior = require('../models/UserBehavior');
const VideoTracking = require('../models/VideoTracking');

let scratchDir = "C:\\Users\\Hulk\\.gemini\\antigravity\\brain\\eb45d72c-b77e-4f35-9838-37d3c91d1071\\scratch";
if (process.platform === 'linux') {
    scratchDir = "/mnt/c/Users/Hulk/.gemini/antigravity/brain/eb45d72c-b77e-4f35-9838-37d3c91d1071/scratch";
}

function readJsonFile(filename) {
    const filePath = path.join(scratchDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`File ${filePath} not found, returning empty array.`);
        return [];
    }
    let content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1).trim();
    }
    if (!content) {
        return [];
    }
    return JSON.parse(content);
}

async function run() {
    console.log('Starting migration seed process...');
    
    // Connect to databases
    const pool = await connectMySQL();
    await connectMongoDB();

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Clean existing MySQL tables in dependency order
        console.log('Cleaning MySQL tables...');
        await conn.query('DELETE FROM tbl_chitietdonhang');
        await conn.query('DELETE FROM tbl_donhang');
        await conn.query('DELETE FROM tbl_giohang');
        await conn.query('DELETE FROM tbl_sanpham');
        await conn.query('DELETE FROM tbl_danhmucsanpham');
        await conn.query('DELETE FROM users');
        await conn.query('DELETE FROM tbl_khachhang');

        // 2. Clean existing MongoDB collections
        console.log('Cleaning MongoDB collections...');
        await UserBehavior.deleteMany({});
        await VideoTracking.deleteMany({});

        // 3. Seed tbl_danhmucsanpham
        console.log('Seeding tbl_danhmucsanpham...');
        const categories = [
            [1, 'áo khoác', 'Áo khoác nam thời trang'],
            [2, 'áo nỉ', 'Áo nỉ, áo sweater ấm áp'],
            [3, 'áo polo', 'Áo polo thanh lịch'],
            [4, 'áo blazer', 'Áo blazer nam lịch lãm']
        ];
        for (const cat of categories) {
            await conn.query('INSERT INTO tbl_danhmucsanpham (id, ten_danh_muc, mo_ta) VALUES (?, ?, ?)', cat);
        }

        // 4. Seed users & tbl_khachhang (we keep both for frontend compatibility)
        console.log('Seeding users...');
        const usersData = readJsonFile('Users.json');
        for (const u of usersData) {
            // Seed into users table
            const userDate = u.CreatedAt ? new Date(u.CreatedAt) : new Date();
            await conn.query(
                'INSERT INTO users (id, ho_ten, email, mat_khau, vai_tro, ngay_tao) VALUES (?, ?, ?, ?, ?, ?)',
                [u.Id, u.Name, u.Email, u.PasswordHash, u.Role, userDate]
            );

            // Seed into tbl_khachhang table
            await conn.query(
                'INSERT INTO tbl_khachhang (id, ho_ten, email, mat_khau, vai_tro, ngay_tao, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [u.Id, u.Name, u.Email, u.PasswordHash, u.Role === 'admin' ? 'admin' : 'user', userDate, 'hoat_dong']
            );
        }

        // 5. Seed tbl_sanpham
        console.log('Seeding tbl_sanpham...');
        const productsData = readJsonFile('Products.json');
        const catMap = { 'áo khoác': 1, 'áo nỉ': 2, 'áo polo': 3, 'áo blazer': 4 };
        for (const p of productsData) {
            const catId = catMap[p.Category.toLowerCase()] || 1;
            const pDate = new Date();
            await conn.query(
                `INSERT INTO tbl_sanpham 
                 (id, ten_san_pham, gia, hinh_anh, mo_ta, so_luong, category_id, ngay_tao, original_price, discount, size, color, preview_images, video_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    p.Id, 
                    p.Name, 
                    p.Price, 
                    p.Image, 
                    p.Description, 
                    p.Stock !== undefined ? p.Stock : 10, 
                    catId, 
                    pDate,
                    p.OriginalPrice || p.Price,
                    p.Discount || 0,
                    p.Size || 'M,L,XL',
                    p.Color || 'Đen,Xám,Trắng',
                    p.PreviewImages || '',
                    p.VideoUrl || ''
                ]
            );
        }

        // 6. Seed tbl_donhang
        console.log('Seeding tbl_donhang...');
        const ordersData = readJsonFile('Orders.json');
        for (const o of ordersData) {
            const oDate = o.OrderDate ? new Date(o.OrderDate) : new Date();
            const statusMap = { 'pending': 'cho_xac_nhan', 'completed': 'hoan_thanh', 'cancelled': 'da_huy' };
            const status = statusMap[o.OrderStatus.toLowerCase()] || 'cho_xac_nhan';
            await conn.query(
                'INSERT INTO tbl_donhang (id, user_id, tong_tien, trang_thai, dia_chi_giao_hang, ngay_dat) VALUES (?, ?, ?, ?, ?, ?)',
                [o.Id, o.UserId, o.TotalAmount, status, o.ShippingAddress, oDate]
            );
        }

        // 7. Seed tbl_chitietdonhang
        console.log('Seeding tbl_chitietdonhang...');
        const orderItemsData = readJsonFile('OrderItems.json');
        for (const item of orderItemsData) {
            await conn.query(
                'INSERT INTO tbl_chitietdonhang (id, donhang_id, product_id, so_luong, don_gia) VALUES (?, ?, ?, ?, ?)',
                [item.Id, item.OrderId, item.ProductId, item.Quantity, item.Price]
            );
        }

        // 8. Seed MongoDB UserBehavior
        console.log('Seeding MongoDB UserBehavior...');
        const behaviorsData = readJsonFile('UserBehaviors.json');
        const userBehaviors = behaviorsData.map(b => {
            // Map event types
            let eventType = b.EventType;
            if (eventType === 'view') eventType = 'view_product';
            if (eventType === 'click') eventType = 'click_product';
            
            return {
                userId: b.UserId,
                eventType: eventType,
                productId: b.ProductId,
                eventData: b.EventData || '',
                durationSeconds: b.DurationSeconds,
                pageName: b.PageName,
                interest: b.Interest,
                startedAt: b.StartedAt ? new Date(b.StartedAt) : null,
                endedAt: b.EndedAt ? new Date(b.EndedAt) : null,
                createdAt: b.CreatedAt ? new Date(b.CreatedAt) : new Date()
            };
        });
        if (userBehaviors.length > 0) {
            await UserBehavior.insertMany(userBehaviors);
        }

        // 9. Seed MongoDB VideoTracking
        console.log('Seeding MongoDB VideoTracking...');
        const videoTrackingsData = readJsonFile('VideoTrackings.json');
        const videoTrackings = videoTrackingsData.map(v => {
            // Extract product id from video url /videos/product{id}.mp4 if possible
            let productId = 1;
            const match = v.VideoUrl.match(/product(\d+)/i);
            if (match) {
                productId = parseInt(match[1]);
            }
            
            return {
                userId: v.UserId,
                videoUrl: v.VideoUrl,
                videoTitle: v.VideoTitle || `Video Product ${productId}`,
                watchedSeconds: v.WatchedSeconds,
                totalDuration: v.TotalDuration,
                watchPercentage: v.WatchPercentage,
                interest: v.Interest,
                watchedAt: v.WatchedAt ? new Date(v.WatchedAt) : new Date(),
                startedAt: v.StartedAt ? new Date(v.StartedAt) : null,
                endedAt: v.EndedAt ? new Date(v.EndedAt) : null
            };
        });
        if (videoTrackings.length > 0) {
            await VideoTracking.insertMany(videoTrackings);
        }

        await conn.commit();
        console.log('Migration seed completed successfully!');
        console.log(`Summary:`);
        console.log(`- MySQL Users: ${usersData.length}`);
        console.log(`- MySQL Products: ${productsData.length}`);
        console.log(`- MySQL Orders: ${ordersData.length}`);
        console.log(`- MongoDB Behaviors: ${userBehaviors.length}`);
        console.log(`- MongoDB Video Trackings: ${videoTrackings.length}`);

    } catch (error) {
        await conn.rollback();
        console.error('Migration seed failed:', error);
    } finally {
        conn.release();
        pool.end();
        process.exit();
    }
}

run();
