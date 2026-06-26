// controllers/TrackingController.js
const UserBehavior = require('../models/UserBehavior');
const VideoTracking = require('../models/VideoTracking');

// === BEHAVIOR TRACKING (MONGODB) ===

exports.logBehavior = async (req, res) => {
    const { userId, eventType, productId, eventData, durationSeconds, pageName, interest, startedAt, endedAt } = req.body;

    if (!eventType) {
        return res.status(400).json({ error: 'EventType là bắt buộc.' });
    }

    try {
        const behavior = new UserBehavior({
            userId: userId || 0,
            eventType,
            productId: productId || null,
            eventData: eventData || '',
            durationSeconds: durationSeconds || null,
            pageName: pageName || null,
            interest: interest || null,
            startedAt: startedAt ? new Date(startedAt) : null,
            endedAt: endedAt ? new Date(endedAt) : null,
            createdAt: new Date()
        });

        await behavior.save();
        return res.status(201).json({ message: 'Event logged successfully', id: behavior._id });
    } catch (error) {
        console.error('Log behavior error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi ghi nhận log hành vi.', detail: error.message });
    }
};

exports.getBehaviors = async (req, res) => {
    const userId = req.query.userId;
    const filter = {};
    if (userId) filter.userId = parseInt(userId);

    try {
        const behaviors = await UserBehavior.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({ data: behaviors, count: behaviors.length });
    } catch (error) {
        console.error('Get behaviors error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách log hành vi.', detail: error.message });
    }
};

exports.getEventStats = async (req, res) => {
    try {
        const stats = await UserBehavior.aggregate([
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $project: { eventType: '$_id', count: 1, _id: 0 } }
        ]);
        return res.status(200).json({ data: stats });
    } catch (error) {
        console.error('Get event stats error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thống kê events.', detail: error.message });
    }
};

exports.getProductViews = async (req, res) => {
    const { productId } = req.params;

    try {
        const viewCount = await UserBehavior.countDocuments({
            productId: parseInt(productId),
            eventType: 'view_product'
        });
        return res.status(200).json({ productId: parseInt(productId), viewCount });
    } catch (error) {
        console.error('Get product views error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy lượt xem sản phẩm.', detail: error.message });
    }
};

exports.getTopProducts = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    try {
        const topProducts = await UserBehavior.aggregate([
            { $match: { eventType: 'view_product', productId: { $ne: null } } },
            { $group: { _id: '$productId', viewCount: { $sum: 1 } } },
            { $sort: { viewCount: -1 } },
            { $limit: limit },
            { $project: { productId: '$_id', viewCount: 1, _id: 0 } }
        ]);
        return res.status(200).json({ data: topProducts });
    } catch (error) {
        console.error('Get top products error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy top sản phẩm.', detail: error.message });
    }
};

// === VIDEO TRACKING (MONGODB) ===

exports.logVideo = async (req, res) => {
    const { userId, videoUrl, videoTitle, watchedSeconds, totalDuration, interest, startedAt, endedAt } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'VideoUrl là bắt buộc.' });
    }

    try {
        const seconds = parseInt(watchedSeconds) || 0;
        const duration = parseInt(totalDuration) || 0;
        const watchPercentage = duration > 0 ? (seconds / duration) * 100 : 0;

        const tracking = new VideoTracking({
            userId: userId || 0,
            videoUrl,
            videoTitle: videoTitle || '',
            watchedSeconds: seconds,
            totalDuration: duration,
            watchPercentage,
            interest: interest || null,
            startedAt: startedAt ? new Date(startedAt) : null,
            endedAt: endedAt ? new Date(endedAt) : null,
            watchedAt: new Date()
        });

        await tracking.save();
        return res.status(201).json({ message: 'Video view logged successfully', id: tracking._id });
    } catch (error) {
        console.error('Log video error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi ghi nhận log video.', detail: error.message });
    }
};

exports.getVideoTrackings = async (req, res) => {
    const { userId } = req.params;
    const filter = {};
    if (userId) filter.userId = parseInt(userId);

    try {
        const trackings = await VideoTracking.find(filter).sort({ watchedAt: -1 });
        return res.status(200).json({ data: trackings, count: trackings.length });
    } catch (error) {
        console.error('Get video trackings error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy log video.', detail: error.message });
    }
};

exports.getTopVideos = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    try {
        const topVideos = await VideoTracking.aggregate([
            {
                $group: {
                    _id: '$videoUrl',
                    viewCount: { $sum: 1 },
                    averageWatchPercentage: { $avg: '$watchPercentage' },
                    totalWatchedSeconds: { $sum: '$watchedSeconds' }
                }
            },
            { $sort: { viewCount: -1 } },
            { $limit: limit },
            {
                $project: {
                    videoUrl: '$_id',
                    viewCount: 1,
                    averageWatchPercentage: { $round: ['$averageWatchPercentage', 1] },
                    totalWatchedSeconds: 1,
                    _id: 0
                }
            }
        ]);
        return res.status(200).json({ data: topVideos });
    } catch (error) {
        console.error('Get top videos error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi thống kê top video.', detail: error.message });
    }
};

exports.getVideoCompletionRate = async (req, res) => {
    const threshold = parseFloat(req.query.completeThreshold) || 90;

    try {
        const totalViews = await VideoTracking.countDocuments({});
        const completedViews = await VideoTracking.countDocuments({ watchPercentage: { $gte: threshold } });
        const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

        return res.status(200).json({
            totalViews,
            completedViews,
            completionRate: parseFloat(completionRate.toFixed(2)),
            completeThreshold: threshold
        });
    } catch (error) {
        console.error('Get video completion rate error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi thống kê tỷ lệ hoàn thành video.', detail: error.message });
    }
};

exports.getVideoInterestAnalysis = async (req, res) => {
    try {
        const allTrackings = await VideoTracking.find({ interest: { $ne: null } });
        const interestMap = {};

        allTrackings.forEach(t => {
            if (!t.interest) return;
            try {
                const interestObj = JSON.parse(t.interest);
                Object.keys(interestObj).forEach(key => {
                    const label = `${key}: ${interestObj[key]}`;
                    interestMap[label] = (interestMap[label] || 0) + 1;
                });
            } catch (err) {
                // If interest is a raw string instead of JSON
                const label = t.interest;
                interestMap[label] = (interestMap[label] || 0) + 1;
            }
        });

        // Convert map to sorted object
        const sortedInterest = Object.keys(interestMap)
            .sort((a, b) => interestMap[b] - interestMap[a])
            .slice(0, 20)
            .reduce((obj, key) => {
                obj[key] = interestMap[key];
                return obj;
            }, {});

        return res.status(200).json({ data: sortedInterest });
    } catch (error) {
        console.error('Get video interest analysis error:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi phân tích sở thích xem video.', detail: error.message });
    }
};
