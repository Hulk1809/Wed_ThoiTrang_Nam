-- Seed Dummy Data
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO users (id, username, email, password_hash)
VALUES ('11111111-1111-1111-1111-111111111111', 'khachvip', 'vip@hulk.com', 'hasashedpw')
ON CONFLICT DO NOTHING;

INSERT INTO movies (id, title, duration)
VALUES ('22222222-2222-2222-2222-222222222222', 'Avengers: Cuộc Chiến Vô Cực', 180)
ON CONFLICT DO NOTHING;

INSERT INTO showtimes (id, movie_id, start_time, room_name)
VALUES ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', NOW() + INTERVAL '2 hours', 'IMAX 1')
ON CONFLICT DO NOTHING;

INSERT INTO seats (id, room_name, seat_row, seat_number)
VALUES 
  (uuid_generate_v4(), 'IMAX 1', 'A', 1), (uuid_generate_v4(), 'IMAX 1', 'A', 2), (uuid_generate_v4(), 'IMAX 1', 'A', 3), (uuid_generate_v4(), 'IMAX 1', 'A', 4), (uuid_generate_v4(), 'IMAX 1', 'A', 5),
  (uuid_generate_v4(), 'IMAX 1', 'B', 1), (uuid_generate_v4(), 'IMAX 1', 'B', 2), (uuid_generate_v4(), 'IMAX 1', 'B', 3), (uuid_generate_v4(), 'IMAX 1', 'B', 4), (uuid_generate_v4(), 'IMAX 1', 'B', 5),
  (uuid_generate_v4(), 'IMAX 1', 'C', 1), (uuid_generate_v4(), 'IMAX 1', 'C', 2), (uuid_generate_v4(), 'IMAX 1', 'C', 3), (uuid_generate_v4(), 'IMAX 1', 'C', 4), (uuid_generate_v4(), 'IMAX 1', 'C', 5)
ON CONFLICT DO NOTHING;
