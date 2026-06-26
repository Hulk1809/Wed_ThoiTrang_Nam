// server.js
global.crypto = require('crypto'); // Ensure global.crypto is available for mongoose/mongodb in Node < 19
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectMySQL, connectMongoDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5281;

// Middlewares
app.use(cors({
    origin: '*', // Allow all origins for development and API compatibility
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Pagination-Total-Count', 'X-Pagination-Total-Pages', 'X-Pagination-Current-Page', 'X-Pagination-Page-Size']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mapping
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/order', require('./routes/orders'));
app.use('/api/userbehavior', require('./routes/userbehavior'));
app.use('/api/videotracking', require('./routes/videotracking'));
app.use('/api/datamining', require('./routes/datamining'));
app.use('/api/recommendation', require('./routes/recommendation'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/users', require('./routes/users'));
app.use('/api/seed', require('./routes/seed'));

// Fallback error handler
app.use((err, req, res, next) => {
    console.error('Express Error Handler:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.', details: err.message });
});

async function startServer() {
    try {
        console.log('Connecting to databases...');
        await connectMySQL();
        await connectMongoDB();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`=========================================`);
            console.log(`Backend Server is running on port: ${PORT}`);
            console.log(`Local Access: http://localhost:${PORT}`);
            console.log(`=========================================`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
