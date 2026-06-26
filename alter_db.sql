ALTER TABLE movies ADD COLUMN IF NOT EXISTS genre VARCHAR(255);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS director VARCHAR(255);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cast_members TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS age_limit VARCHAR(10) DEFAULT 'T18';

TRUNCATE TABLE showtimes CASCADE;
TRUNCATE TABLE movies CASCADE;

-- Dùng ảnh từ TMDB - không bị CORS, ổn định và đẹp
INSERT INTO movies (id, title, duration, release_date, country, rating, vote_count, age_limit, genre, director, cast_members, poster_url, cover_url)
VALUES 
(
  '33333333-3333-3333-3333-333333333331', 
  'Quỷ Dữ Từ Luyện Ngục', 
  101, 
  '2026-04-10', 
  'Thái Lan', 
  8.5, 
  17, 
  'T18',
  'Kinh Dị, Giật Gân', 
  'Ekkachai Srivichai', 
  'Sai Charoenpura, Saiparn Apinya, Gun Napat Injaieua', 
  'https://image.tmdb.org/t/p/w500/4m1Au3YkjqsxF8iwQy0fPYSxE0h.jpg',
  'https://image.tmdb.org/t/p/original/4m1Au3YkjqsxF8iwQy0fPYSxE0h.jpg'
),
(
  '33333333-3333-3333-3333-333333333332', 
  'Sirat: Chuyến Đi Bão Cát', 
  120, 
  '2026-04-10', 
  'Tây Ban Nha', 
  8.1, 
  5, 
  'T18',
  'Tâm Lý, Hành Động', 
  'Oliver Laxe', 
  'Oscar Isaac, Charlize Theron', 
  'https://image.tmdb.org/t/p/w500/mDzHzSW5DX6aViD2L1YdUkQI4X0.jpg',
  'https://image.tmdb.org/t/p/original/mDzHzSW5DX6aViD2L1YdUkQI4X0.jpg'
),
(
  '33333333-3333-3333-3333-333333333333', 
  'Dưới Bóng Điện Hạ', 
  135, 
  '2026-04-10', 
  'Hàn Quốc', 
  9.8, 
  200, 
  'T16',
  'Cổ Trang, Tình Cảm', 
  'Park Hee-kon', 
  'Cho Seung-woo, Ji Sung, Kim Sung-kyun', 
  'https://image.tmdb.org/t/p/w500/k3waqVXSnFLObR86aFCLdnmExQZ.jpg',
  'https://image.tmdb.org/t/p/original/k3waqVXSnFLObR86aFCLdnmExQZ.jpg'
),
(
  '33333333-3333-3333-3333-333333333334', 
  'Bẫy Tiến: Cú Lừa Tiền Tỷ', 
  118, 
  '2026-04-10', 
  'Thái Lan', 
  8.2, 
  150, 
  'T16',
  'Hài Điệp Viên, Tâm Lý', 
  'Mez Tharatorn', 
  'Nadech Kugimiya, Pimchanok Luevisadpaibul', 
  'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
  'https://image.tmdb.org/t/p/original/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
);

INSERT INTO showtimes (id, movie_id, start_time, room_name)
VALUES 
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', NOW() + INTERVAL '1 hours', 'Galaxy Nguyễn Du - Rạp 1'),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333331', NOW() + INTERVAL '3 hours', 'Galaxy Nguyễn Du - Rạp 3'),
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333331', NOW() + INTERVAL '5 hours', 'Galaxy Tân Bình - Rạp 2'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333332', NOW() + INTERVAL '2 hours', 'Galaxy Nguyễn Du - Rạp 2'),
('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333332', NOW() + INTERVAL '4 hours', 'Galaxy Tân Bình - Rạp 1'),
('44444444-4444-4444-4444-444444444446', '33333333-3333-3333-3333-333333333333', NOW() + INTERVAL '2 hours', 'Galaxy Nguyễn Du - Rạp 4'),
('44444444-4444-4444-4444-444444444447', '33333333-3333-3333-3333-333333333334', NOW() + INTERVAL '3 hours', 'Galaxy Kiên Giang - Rạp 1');

-- Tạo ghế cho tất cả suất chiếu
DO $$
DECLARE
  showtime_rec RECORD;
  rows TEXT[] := ARRAY['A','B','C','D','E'];
  r TEXT;
  c INT;
BEGIN
  FOR showtime_rec IN SELECT id, room_name FROM showtimes LOOP
    FOREACH r IN ARRAY rows LOOP
      FOR c IN 1..8 LOOP
        BEGIN
          INSERT INTO seats (id, room_name, seat_row, seat_number)
          VALUES (uuid_generate_v4(), showtime_rec.room_name, r, c)
          ON CONFLICT DO NOTHING;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
