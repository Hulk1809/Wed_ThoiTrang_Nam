// models/UserBehavior.js
const mongoose = require('mongoose');

const UserBehaviorSchema = new mongoose.Schema({
    userId: { type: Number, required: true }, // ID from MySQL users table
    eventType: { type: String, required: true }, // "view", "click", "add_to_cart", "search", "purchase", "scroll"
    productId: { type: Number, default: null }, // ID from MySQL products
    eventData: { type: String, default: '' },
    durationSeconds: { type: Number, default: null },
    pageName: { type: String, default: null },
    interest: { type: String, default: null }, // JSON or string
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserBehavior', UserBehaviorSchema);
