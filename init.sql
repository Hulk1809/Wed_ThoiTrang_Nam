-- ==========================================
-- DDL CHO NGHIỆP VỤ BÁN VÉ XEM PHIM
-- ==========================================

-- Bật extension tạo UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Người dùng
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Chú thích Phim
CREATE TABLE Movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    duration INT NOT NULL, -- Thời lượng tính bằng phút
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Lịch chiếu (Suất chiếu)
CREATE TABLE Showtimes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES Movies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Sơ đồ Ghế ngồi (Phụ thuộc rạp chiếu)
CREATE TABLE Seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name VARCHAR(50) NOT NULL,
    seat_row VARCHAR(5) NOT NULL, -- VD: A, B, C
    seat_number INT NOT NULL,     -- VD: 1, 2, 3
    UNIQUE(room_name, seat_row, seat_number)
);
