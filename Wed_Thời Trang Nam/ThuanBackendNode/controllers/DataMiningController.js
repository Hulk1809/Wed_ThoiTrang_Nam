// controllers/DataMiningController.js
const { getMySQLPool } = require('../config/db');
const UserBehavior = require('../models/UserBehavior');
const VideoTracking = require('../models/VideoTracking');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Helper to run Python K-Means script
function runPythonKMeans(payload) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', '..', 'kmeans_engine', 'kmeans.py');
        const pythonPath = process.env.PYTHON_PATH || 'python';

        console.log(`Running Python K-Means script at ${scriptPath} using ${pythonPath}...`);
        
        const pyProcess = spawn(pythonPath, [scriptPath]);
        
        let stdout = '';
        let stderr = '';

        pyProcess.stdin.write(JSON.stringify(payload));
        pyProcess.stdin.end();

        pyProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pyProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}. Stderr: ${stderr}`);
                return reject(new Error(stderr || `Python script exited with code ${code}`));
            }
            try {
                const result = JSON.parse(stdout);
                if (result.error) {
                    return reject(new Error(result.error));
                }
                resolve(result);
            } catch (err) {
                console.error('Failed to parse Python stdout:', stdout);
                reject(err);
            }
        });
    });
}

exports.runKMeans = async (req, res) => {
    const k = parseInt(req.body.k) || 3;

    try {
        const pool = getMySQLPool();
        
        // 1. Get all active user IDs from behaviors & video trackings
        const behaviorUserIds = await UserBehavior.distinct('userId');
        const videoUserIds = await VideoTracking.distinct('userId');
        
        // Union and remove 0 (anonymous)
        const allUserIds = Array.from(new Set([...behaviorUserIds, ...videoUserIds])).filter(id => id > 0);

        if (allUserIds.length === 0) {
            return res.status(400).json({ error: 'Chưa có đủ dữ liệu hành vi để thực hiện phân cụm.' });
        }

        if (allUserIds.length < k) {
            return res.status(400).json({ error: `Số lượng tài khoản (${allUserIds.length}) phải lớn hơn hoặc bằng số nhóm K (${k}).` });
        }

        // 2. Fetch behaviors and video trackings from MongoDB
        const behaviors = await UserBehavior.find({ userId: { $in: allUserIds } });
        const videoTrackings = await VideoTracking.find({ userId: { $in: allUserIds } });

        // Fetch purchase counts from MySQL
        const [purchases] = await pool.query('SELECT user_id, COUNT(*) as count FROM tbl_donhang GROUP BY user_id');
        const purchaseMap = purchases.reduce((map, p) => {
            map[p.user_id] = p.count;
            return map;
        }, {});

        // 3. Extract user feature vectors:
        // [viewCount, totalWatchTime, productDiversity, videoWatchPercentage, purchaseCount]
        const usersPayload = allUserIds.map(userId => {
            const userBehaviors = behaviors.filter(b => b.userId === userId);
            const userVideos = videoTrackings.filter(v => v.userId === userId);

            const viewCount = userBehaviors.filter(b => b.eventType === 'view_product').length;
            const totalWatchTime = userBehaviors.reduce((sum, b) => sum + (b.durationSeconds || 0), 0);
            
            const uniqueViewedProducts = new Set(
                userBehaviors.filter(b => b.productId !== null).map(b => b.productId)
            );
            const productDiversity = uniqueViewedProducts.size;

            const videoWatchPercentage = userVideos.length > 0
                ? userVideos.reduce((sum, v) => sum + (v.watchPercentage || 0), 0) / userVideos.length
                : 0;

            const purchaseCount = purchaseMap[userId] || 0;

            return {
                userId,
                features: [viewCount, totalWatchTime, productDiversity, videoWatchPercentage, purchaseCount]
            };
        });

        // 4. Run Python K-Means engine
        const result = await runPythonKMeans({ k, users: usersPayload });

        // Begin SQL Transaction to update tbl_ketquaphancum
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        try {
            // Delete old cluster results
            await conn.query('DELETE FROM tbl_ketquaphancum');

            // Find average viewCount per cluster to name them dynamically
            const clusterAverages = {};
            result.assignments.forEach(assign => {
                const userFeats = usersPayload.find(u => u.userId === assign.userId);
                const views = userFeats ? userFeats.features[0] : 0;
                
                if (!clusterAverages[assign.clusterId]) {
                    clusterAverages[assign.clusterId] = { sum: 0, count: 0 };
                }
                clusterAverages[assign.clusterId].sum += views;
                clusterAverages[assign.clusterId].count += 1;
            });

            const clusterSorted = Object.keys(clusterAverages).map(cid => ({
                clusterId: parseInt(cid),
                avgViews: clusterAverages[cid].sum / clusterAverages[cid].count
            })).sort((a, b) => b.avgViews - a.avgViews); // Descending by average views

            // Map: Rank 0 -> VIP / High Engagement, Rank 1 -> Regular / Medium, Rank 2 -> New / Low
            const rankMap = {};
            clusterSorted.forEach((item, index) => {
                rankMap[item.clusterId] = index;
            });

            // Re-map cluster assignment IDs to High (0), Medium (1), Low (2)
            const finalAssignments = result.assignments.map(assign => {
                const mappedClusterId = rankMap[assign.clusterId];
                return {
                    userId: assign.userId,
                    clusterId: mappedClusterId
                };
            });

            // Insert into MySQL tbl_ketquaphancum
            for (const assign of finalAssignments) {
                const clusterName = assign.clusterId === 0 ? 'High Engagement' : assign.clusterId === 1 ? 'Medium Engagement' : 'Low Engagement';
                const desc = assign.clusterId === 0 
                    ? 'Khách hàng rất quan tâm, thường xuyên xem video và sản phẩm' 
                    : assign.clusterId === 1 
                        ? 'Khách hàng có quan tâm vừa phải, xem đôi khi' 
                        : 'Khách hàng ít quan tâm, hiếm khi tương tác';

                await conn.query(
                    'INSERT INTO tbl_ketquaphancum (user_id, cluster_id, ten_nhom, mo_ta, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [assign.userId, assign.clusterId, clusterName, desc]
                );
            }

            // Sync with old tbl_dulieuk-means (for backward compatibility if needed)
            await conn.query('DELETE FROM `tbl_dulieuk-means`');
            for (const u of usersPayload) {
                const assign = finalAssignments.find(a => a.userId === u.userId);
                const clusterId = assign ? assign.clusterId : null;
                
                await conn.query(
                    `INSERT INTO \`tbl_dulieuk-means\` 
                     (user_id, thoi_gian_xem, so_lan_nhap, do_sau_cuon, created_at, thoi_gian_xem_video, so_san_pham_da_xem, so_lan_them_gio, so_lan_mua, nhom_kmeans, cap_nhat_luc) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [u.userId, u.features[1], u.features[0], 0, Math.floor(Date.now()/1000), u.features[3], u.features[2], 0, u.features[4], clusterId]
                );
            }

            await conn.commit();

            // Format response
            const clusterMap = {};
            finalAssignments.forEach(assign => {
                if (!clusterMap[assign.clusterId]) {
                    clusterMap[assign.clusterId] = { userCount: 0, userIds: [] };
                }
                clusterMap[assign.clusterId].userCount++;
                clusterMap[assign.clusterId].userIds.push(assign.userId);
            });

            return res.status(200).json({
                message: 'K-means clustering completed',
                k,
                clusterCount: Object.keys(clusterMap).length,
                assignments: finalAssignments,
                clusters: clusterMap
            });

        } catch (dbError) {
            await conn.rollback();
            throw dbError;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error('K-Means clustering error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi thực hiện phân cụm K-Means.', detail: error.message });
    }
};

exports.getBehaviorAnalysis = async (req, res) => {
    try {
        const pool = getMySQLPool();
        
        // Fetch users from tbl_ketquaphancum
        const [clusters] = await pool.query(
            `SELECT cluster_id as clusterId, ten_nhom as name, COUNT(*) as userCount, mo_ta as description 
             FROM tbl_ketquaphancum 
             GROUP BY cluster_id, ten_nhom, mo_ta`
        );

        // Fetch user profiles features average to construct analytics
        const behaviorUserIds = await UserBehavior.distinct('userId');
        const videoUserIds = await VideoTracking.distinct('userId');
        const allUserIds = Array.from(new Set([...behaviorUserIds, ...videoUserIds])).filter(id => id > 0);

        const behaviors = await UserBehavior.find({ userId: { $in: allUserIds } });
        const videoTrackings = await VideoTracking.find({ userId: { $in: allUserIds } });

        const [dbAssignments] = await pool.query('SELECT user_id, cluster_id FROM tbl_ketquaphancum');
        const assignMap = dbAssignments.reduce((map, a) => {
            map[a.user_id] = a.cluster_id;
            return map;
        }, {});

        const clusterAverages = {
            0: { sumViews: 0, sumVideos: 0, count: 0 },
            1: { sumViews: 0, sumVideos: 0, count: 0 },
            2: { sumViews: 0, sumVideos: 0, count: 0 }
        };

        allUserIds.forEach(userId => {
            const clusterId = assignMap[userId];
            if (clusterId === undefined || clusterId === null) return;

            const userViews = behaviors.filter(b => b.userId === userId && b.eventType === 'view_product').length;
            const userVideosTime = videoTrackings.filter(v => v.userId === userId).reduce((sum, v) => sum + (v.watchedSeconds || 0), 0);

            if (!clusterAverages[clusterId]) {
                clusterAverages[clusterId] = { sumViews: 0, sumVideos: 0, count: 0 };
            }
            clusterAverages[clusterId].sumViews += userViews;
            clusterAverages[clusterId].sumVideos += userVideosTime;
            clusterAverages[clusterId].count += 1;
        });

        const userProfiles = [0, 1, 2].map(cid => {
            const avg = clusterAverages[cid] || { sumViews: 0, sumVideos: 0, count: 0 };
            const count = avg.count || 0;
            
            const name = cid === 0 ? 'High Engagement' : cid === 1 ? 'Medium Engagement' : 'Low Engagement';
            const desc = cid === 0 
                ? 'Khách hàng rất quan tâm, thường xuyên xem video và sản phẩm' 
                : cid === 1 
                    ? 'Khách hàng có quan tâm vừa phải, xem đôi khi' 
                    : 'Khách hàng ít quan tâm, hiếm khi tương tác';

            return {
                clusterId: cid,
                name,
                userCount: count,
                averageEngagement: count > 0 ? avg.sumViews / count : 0,
                averageWatchTime: count > 0 ? avg.sumVideos / count : 0,
                description: desc
            };
        });

        return res.status(200).json({
            timestamp: new Date(),
            totalClusters: 3,
            userProfiles
        });
    } catch (error) {
        console.error('Get behavior analysis error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy phân tích phân cụm.', detail: error.message });
    }
};

exports.getUsersBehaviorDetail = async (req, res) => {
    const { userId } = req.query;

    try {
        const pool = getMySQLPool();
        
        // 1. Get user IDs
        let userFilterQuery = 'SELECT id, ho_ten as name, email, vai_tro as role FROM users';
        let queryParams = [];
        if (userId) {
            userFilterQuery += ' WHERE id = ?';
            queryParams.push(userId);
        }
        const [users] = await pool.query(userFilterQuery, queryParams);

        if (users.length === 0) {
            return res.status(200).json({ data: [], count: 0 });
        }

        const userIds = users.map(u => u.id);

        // Fetch MongoDB behaviors and videos
        const behaviors = await UserBehavior.find({ userId: { $in: userIds } }).sort({ createdAt: -1 });
        const videos = await VideoTracking.find({ userId: { $in: userIds } }).sort({ watchedAt: -1 });
        
        // Fetch products mapping
        const [products] = await pool.query('SELECT id, ten_san_pham as name FROM tbl_sanpham');
        const productMap = products.reduce((map, p) => {
            map[p.id] = p.name;
            return map;
        }, {});

        const result = users.map(user => {
            const userBehaviors = behaviors.filter(b => b.userId === user.id);
            const userVideos = videos.filter(v => v.userId === user.id);

            const productViews = userBehaviors
                .filter(b => b.eventType === 'view_product' && b.productId)
                .map(b => ({
                    id: b._id,
                    productId: b.productId,
                    productName: productMap[b.productId] || 'Sản phẩm ẩn',
                    durationSeconds: b.durationSeconds,
                    interest: b.interest,
                    pageName: b.pageName,
                    createdAt: b.createdAt
                }));

            const formattedVideos = userVideos.map(v => ({
                id: v._id,
                videoTitle: v.videoTitle,
                videoUrl: v.videoUrl,
                watchedSeconds: v.watchedSeconds,
                totalDuration: v.totalDuration,
                watchPercentage: v.watchPercentage,
                interest: v.interest,
                watchedAt: v.watchedAt
            }));

            // Group event counts
            const eventCounts = {};
            userBehaviors.forEach(b => {
                eventCounts[b.eventType] = (eventCounts[b.eventType] || 0) + 1;
            });
            const eventSummary = Object.keys(eventCounts).map(key => ({
                eventType: key,
                count: eventCounts[key]
            }));

            return {
                userId: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                summary: {
                    totalEvents: userBehaviors.length,
                    videoCount: userVideos.length,
                    productViewCount: productViews.length,
                    uploadCount: 0
                },
                eventSummary,
                videos: formattedVideos,
                productViews,
                uploads: [] // Placeholders for compat
            };
        });

        return res.status(200).json({ data: result, count: result.length });
    } catch (error) {
        console.error('Get users behavior detail error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy chi tiết hành vi.', detail: error.message });
    }
};

exports.generateAdStrategy = async (req, res) => {
    try {
        const pool = getMySQLPool();
        const [clusters] = await pool.query('SELECT cluster_id, COUNT(*) as count FROM tbl_ketquaphancum GROUP BY cluster_id');
        
        const counts = { 0: 0, 1: 0, 2: 0 };
        clusters.forEach(c => {
            counts[c.cluster_id] = c.count;
        });

        // Rules-based smart marketing strategy generator
        const total = counts[0] + counts[1] + counts[2];
        const vipPct = total > 0 ? Math.round((counts[0] / total) * 100) : 0;
        const regPct = total > 0 ? Math.round((counts[1] / total) * 100) : 0;
        const newPct = total > 0 ? Math.round((counts[2] / total) * 100) : 0;

        let strategy = `## BÁO CÁO PHÂN TÍCH HÀ HÀNH VI & CHIẾN LƯỢC QUẢNG CÁO\n\n`;
        strategy += `*Tổng số khách hàng phân tích:* **${total} tài khoản**\n\n`;
        strategy += `### 1. Phân Phối Cụm Khách Hàng:\n`;
        strategy += `- **High Engagement (VIP - Cụm 0):** ${counts[0]} khách hàng (${vipPct}%)\n`;
        strategy += `- **Medium Engagement (Regular - Cụm 1):** ${counts[1]} khách hàng (${regPct}%)\n`;
        strategy += `- **Low Engagement (New/Chưa Active - Cụm 2):** ${counts[2]} khách hàng (${newPct}%)\n\n`;

        strategy += `### 2. Đề Xuất Chiến Lược Marketing & Quảng Cáo:\n\n`;
        
        strategy += `#### Nhóm VIP (High Engagement):\n`;
        strategy += `- **Đặc trưng:** Khách hàng trung thành, có thời gian xem video sản phẩm và số lần xem trang chi tiết rất cao.\n`;
        strategy += `- **Hành động:**\n`;
        strategy += `  - Gửi mã giảm giá tri ân đặc quyền (Loyalty coupon 15-20%).\n`;
        strategy += `  - Đề xuất các sản phẩm Premium, bộ sưu tập giới hạn mới nhất.\n`;
        strategy += `  - Triển khai chiến dịch email marketing cá nhân hóa giới thiệu sản phẩm đi kèm (cross-sell).\n\n`;

        strategy += `#### Nhóm Regular (Medium Engagement):\n`;
        strategy += `- **Đặc trưng:** Đã có quan tâm đến sản phẩm nhưng mức độ tương tác hoặc tần suất mua chưa cao.\n`;
        strategy += `- **Hành động:**\n`;
        strategy += `  - Đề xuất các sản phẩm bán chạy nhất (Best Sellers) cùng danh mục họ đã xem.\n`;
        strategy += `  - Tặng voucher kích cầu mua sắm có thời hạn ngắn (Voucher giảm 10% hết hạn trong 48h).\n`;
        strategy += `  - Hiển thị quảng cáo retargeting trên mạng xã hội với video sản phẩm thu hút.\n\n`;

        strategy += `#### Nhóm New/Idle (Low Engagement):\n`;
        strategy += `- **Đặc trưng:** Khách hàng mới đăng ký hoặc ít vào xem trang, tỉ lệ xem video dưới 10%.\n`;
        strategy += `- **Hành động:**\n`;
        strategy += `  - Gửi email welcome cùng quà tặng chào mừng (Voucher 50k cho đơn hàng đầu tiên).\n`;
        strategy += `  - Gợi ý sản phẩm cơ bản, dễ mua (như áo thun trơn basic, áo polo quốc dân).\n`;
        strategy += `  - Tối ưu trang chủ hiển thị banner thu hút và đơn giản hóa quy trình mua sắm.\n\n`;

        strategy += `*Hệ thống tự động xoay kênh quảng cáo phù hợp dựa trên hành vi phân nhóm khách hàng theo thời gian thực.*`;

        return res.status(200).json({
            message: 'Đề xuất chiến lược (phân tích local — Gemini không khả dụng)',
            source: 'local',
            generatedAt: new Date(),
            strategy
        });
    } catch (error) {
        console.error('Generate ad strategy error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo chiến lược quảng cáo.', detail: error.message });
    }
};
