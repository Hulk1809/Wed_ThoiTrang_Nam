// config/db.js
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let mysqlPool = null;

async function connectMySQL() {
    if (mysqlPool) return mysqlPool;

    try {
        // Create connection pool
        mysqlPool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'web_hthuose',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            multipleStatements: true // Allows running multiple queries (for schema import)
        });

        // Test connection
        const conn = await mysqlPool.getConnection();
        console.log('Successfully connected to MySQL database.');
        conn.release();

        // Initialize schema if tables do not exist
        await initializeMySQLSchema();

        return mysqlPool;
    } catch (error) {
        console.error('MySQL Connection Error:', error);
        throw error;
    }
}

async function initializeMySQLSchema() {
    try {
        const [rows] = await mysqlPool.query("SHOW TABLES LIKE 'users'");
        if (rows.length === 0) {
            console.log('Initializing MySQL schema from schema.sql...');
            const schemaPath = path.join(__dirname, '..', '..', '..', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                let schemaSql = fs.readFileSync(schemaPath, 'utf8');
                // Fix a potential typo in tbl_danhmucsanpham ten_danh_muc int(100) -> varchar(100)
                schemaSql = schemaSql.replace(/`ten_danh_muc` int\(100\) NOT NULL/g, '`ten_danh_muc` varchar(100) NOT NULL');
                // Execute the entire schema file using multipleStatements support
                await mysqlPool.query(schemaSql);
                console.log('MySQL schema initialized successfully.');
            } else {
                console.warn(`schema.sql not found at ${schemaPath}, skipping auto-initialization.`);
            }
        } else {
            console.log('MySQL schema already exists. Checking for upgrades...');
        }

        // Apply upgrades (UploadedFiles table & tbl_sanpham columns)
        console.log('Applying database upgrades (if any)...');
        
        // 1. Create UploadedFiles table if not exists
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS \`UploadedFiles\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`file_name\` varchar(255) NOT NULL,
              \`file_url\` varchar(255) NOT NULL,
              \`file_type\` varchar(50) NOT NULL,
              \`file_size_bytes\` bigint(20) NOT NULL,
              \`user_id\` int(11) DEFAULT NULL,
              \`description\` text DEFAULT NULL,
              \`uploaded_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
              \`download_count\` int(11) NOT NULL DEFAULT 0,
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Add upgraded columns to tbl_sanpham
        await mysqlPool.query(`
            ALTER TABLE \`tbl_sanpham\` 
            ADD COLUMN IF NOT EXISTS \`original_price\` decimal(12,2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS \`discount\` int(11) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS \`size\` varchar(255) DEFAULT 'M,L,XL',
            ADD COLUMN IF NOT EXISTS \`color\` varchar(255) DEFAULT 'Đen,Xám,Trắng',
            ADD COLUMN IF NOT EXISTS \`preview_images\` text DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS \`video_url\` varchar(255) DEFAULT NULL;
        `);

        console.log('Database upgrades applied successfully.');
    } catch (error) {
        console.error('Error initializing MySQL schema or upgrades:', error);
    }
}

async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/web_hthuose';
        await mongoose.connect(mongoUri);
        console.log('Successfully connected to MongoDB.');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        throw error;
    }
}

module.exports = {
    connectMySQL,
    connectMongoDB,
    getMySQLPool: () => mysqlPool
};
