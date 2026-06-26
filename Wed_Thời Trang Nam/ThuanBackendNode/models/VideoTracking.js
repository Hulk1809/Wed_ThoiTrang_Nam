// models/VideoTracking.js
const mongoose = require('mongoose');

const VideoTrackingSchema = new mongoose.Schema({
    userId: { type: Number, required: true }, // ID from MySQL users table
    videoUrl: { type: String, required: true },
    videoTitle: { type: String, default: '' },
    watchedSeconds: { type: Number, required: true },
    totalDuration: { type: Number, required: true },
    watchPercentage: { type: Number, default: 0 },
    interest: { type: String, default: null }, // JSON or string
    watchedAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null }
});

module.exports = mongoose.model('VideoTracking', VideoTrackingSchema);
