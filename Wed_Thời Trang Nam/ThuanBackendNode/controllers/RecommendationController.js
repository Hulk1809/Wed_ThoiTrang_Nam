// controllers/RecommendationController.js
const { getMySQLPool } = require('../config/db');
const UserBehavior = require('../models/UserBehavior');

// Helper: Clusterize user based on local engagement rules
function clusterizeUser(userId, behaviors) {
    const viewCount = behaviors.filter(b => b.eventType === 'view' || b.eventType === 'view_product').length;
    const purchaseCount = behaviors.filter(b => b.eventType === 'purchase').length;
    const cartCount = behaviors.filter(b => b.eventType === 'add_to_cart').length;

    // engagementScore = view + cart*2 + purchase*3
    const engagementScore = viewCount + (cartCount * 2) + (purchaseCount * 3);

    let segmentId;
    let segmentName;

    if (engagementScore >= 20) {
        segmentId = 0;
        segmentName = "VIP Customers";
    } else if (engagementScore >= 5) {
        segmentId = 1;
        segmentName = "Regular Customers";
    } else {
        segmentId = 2;
        segmentName = "New Customers";
    }

    return {
        userId,
        segmentId,
        segmentName,
        totalViews: viewCount,
        totalPurchases: purchaseCount,
        avgSpent: purchaseCount > 0 ? parseFloat((engagementScore / purchaseCount).toFixed(2)) : 0
    };
}

function getClusterName(clusterId) {
    switch (clusterId) {
        case 0: return "VIP Customers";
        case 1: return "Regular Customers";
        case 2: return "New Customers";
        default: return "Unknown";
    }
}

// Fallback: popular products ordered by discount desc, then price desc
async function getPopularProducts(limit) {
    const pool = getMySQLPool();
    const [products] = await pool.query(
        'SELECT * FROM tbl_sanpham ORDER BY discount DESC, gia DESC LIMIT ?',
        [limit]
    );

    return products.map(p => ({
        productId: p.id,
        productName: p.ten_san_pham,
        price: parseFloat(p.gia),
        image: p.hinh_anh,
        category: p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer',
        confidence: 60,
        reason: "Sản phẩm phổ biến"
    }));
}

// Category-based recommendations: same category, not viewed/added to cart
async function getCategoryBasedRecommendations(viewedProductIds, cartProductIds, limit) {
    if (!viewedProductIds.length) return [];

    const pool = getMySQLPool();
    
    // Get categories of viewed products
    const [viewedProducts] = await pool.query(
        'SELECT category_id FROM tbl_sanpham WHERE id IN (?)',
        [viewedProductIds]
    );
    const categoryIds = Array.from(new Set(viewedProducts.map(p => p.category_id)));

    if (!categoryIds.length) return [];

    // Get similar products
    const excludeIds = [...viewedProductIds, ...cartProductIds];
    
    let query = 'SELECT * FROM tbl_sanpham WHERE category_id IN (?)';
    const params = [categoryIds];

    if (excludeIds.length > 0) {
        query += ' AND id NOT IN (?)';
        params.push(excludeIds);
    }

    query += ' ORDER BY discount DESC LIMIT ?';
    params.push(limit);

    const [similarProducts] = await pool.query(query, params);

    return similarProducts.map(p => {
        const catName = p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer';
        return {
            productId: p.id,
            productName: p.ten_san_pham,
            price: parseFloat(p.gia),
            image: p.hinh_anh,
            category: catName,
            confidence: 75,
            reason: `Cùng danh mục ${catName} mà bạn yêu thích`
        };
    });
}

// Cluster-based recommendations: products bought by same cluster users
async function getClusterBasedRecommendations(userCluster, viewedProductIds, limit) {
    // 1. Get all behaviors from other users
    const allBehaviors = await UserBehavior.find({ userId: { $ne: userCluster.userId } });
    if (!allBehaviors.length) return [];

    // 2. Identify other users in the same cluster
    const distinctUserIds = Array.from(new Set(allBehaviors.map(b => b.userId)));
    const usersInCluster = [];

    for (const otherUserId of distinctUserIds) {
        const otherBehaviors = allBehaviors.filter(b => b.userId === otherUserId);
        const cluster = clusterizeUser(otherUserId, otherBehaviors);
        if (cluster.segmentId === userCluster.segmentId) {
            usersInCluster.push(otherUserId);
        }
    }

    if (!usersInCluster.length) return [];

    // 3. Find products bought by same cluster users, excluding viewed products
    const clusterPurchases = allBehaviors.filter(b => 
        usersInCluster.includes(b.userId) && 
        b.eventType === 'purchase' && 
        b.productId && 
        !viewedProductIds.includes(b.productId)
    );

    if (!clusterPurchases.length) return [];

    // Count purchases per product
    const productCounts = {};
    clusterPurchases.forEach(p => {
        productCounts[p.productId] = (productCounts[p.productId] || 0) + 1;
    });

    const topProductIds = Object.keys(productCounts)
        .sort((a, b) => productCounts[b] - productCounts[a])
        .slice(0, limit)
        .map(id => parseInt(id));

    if (!topProductIds.length) return [];

    const pool = getMySQLPool();
    const [products] = await pool.query(
        'SELECT * FROM tbl_sanpham WHERE id IN (?)',
        [topProductIds]
    );

    return products.map(p => ({
        productId: p.id,
        productName: p.ten_san_pham,
        price: parseFloat(p.gia),
        image: p.hinh_anh,
        category: p.category_id === 1 ? 'áo khoác' : p.category_id === 2 ? 'áo nỉ' : p.category_id === 3 ? 'áo polo' : 'áo blazer',
        confidence: 85,
        reason: `Những khách hàng ${userCluster.segmentName.toLowerCase()} cũng thích`
    }));
}

// GET /api/recommendation
exports.getRecommendations = async (req, res) => {
    const userId = parseInt(req.query.userId);
    const limit = parseInt(req.query.limit) || 5;

    if (!userId) {
        return res.status(400).json({ error: 'userId là bắt buộc.' });
    }

    try {
        // 1. Get user behaviors from MongoDB
        const userBehaviors = await UserBehavior.find({ userId: userId });

        if (userBehaviors.length === 0) {
            // Fallback to popular products
            const popular = await getPopularProducts(limit);
            return res.status(200).json({ recommendations: popular, cluster: null });
        }

        // 2. Identify viewed & cart products
        const viewedProductIds = Array.from(new Set(
            userBehaviors
                .filter(b => (b.eventType === 'view' || b.eventType === 'view_product') && b.productId)
                .map(b => b.productId)
        ));

        const cartProductIds = Array.from(new Set(
            userBehaviors
                .filter(b => b.eventType === 'add_to_cart' && b.productId)
                .map(b => b.productId)
        ));

        const userCluster = clusterizeUser(userId, userBehaviors);

        // 3. Category recommendations
        const categoryBased = await getCategoryBasedRecommendations(viewedProductIds, cartProductIds, limit);

        // 4. Cluster recommendations
        const clusterBased = await getClusterBasedRecommendations(userCluster, viewedProductIds, limit);

        // 5. Merge and sort
        const merged = [];
        // Add cluster-based first
        clusterBased.sort((a, b) => b.confidence - a.confidence).forEach(rec => merged.push(rec));

        // Add category-based if not duplicate
        categoryBased.sort((a, b) => b.confidence - a.confidence).forEach(rec => {
            if (!merged.some(m => m.productId === rec.productId)) {
                merged.push(rec);
            }
        });

        const finalRecommendations = merged.slice(0, limit);

        return res.status(200).json({
            recommendations: finalRecommendations,
            cluster: userCluster
        });
    } catch (error) {
        console.error('Recommendation API error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/recommendation/segment
exports.getUserSegment = async (req, res) => {
    const userId = parseInt(req.query.userId);

    if (!userId) {
        return res.status(400).json({ error: 'userId là bắt buộc.' });
    }

    try {
        const userBehaviors = await UserBehavior.find({ userId: userId });
        const segment = clusterizeUser(userId, userBehaviors);
        return res.status(200).json(segment);
    } catch (error) {
        console.error('User segment API error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// GET /api/recommendation/top-clusters
exports.getAllClusters = async (req, res) => {
    try {
        const allBehaviors = await UserBehavior.find({});
        const allUserIds = Array.from(new Set(allBehaviors.map(b => b.userId))).filter(id => id > 0);

        const clusterSummary = [];

        for (const clusterId of [0, 1, 2]) {
            const usersInCluster = [];
            let totalViews = 0;
            let totalPurchases = 0;

            for (const uid of allUserIds) {
                const behaviors = allBehaviors.filter(b => b.userId === uid);
                const cluster = clusterizeUser(uid, behaviors);
                if (cluster.segmentId === clusterId) {
                    usersInCluster.push(uid);
                    totalViews += behaviors.filter(b => b.eventType === 'view' || b.eventType === 'view_product').length;
                    totalPurchases += behaviors.filter(b => b.eventType === 'purchase').length;
                }
            }

            clusterSummary.push({
                clusterId,
                name: getClusterName(clusterId),
                userCount: usersInCluster.length,
                totalViews,
                totalPurchases,
                avgPurchasePerUser: usersInCluster.length > 0 ? parseFloat((totalPurchases / usersInCluster.length).toFixed(2)) : 0
            });
        }

        return res.status(200).json(clusterSummary);
    } catch (error) {
        console.error('All clusters API error:', error);
        return res.status(500).json({ error: error.message });
    }
};
