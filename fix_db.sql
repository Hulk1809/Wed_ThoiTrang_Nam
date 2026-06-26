CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    showtime_id UUID REFERENCES showtimes(id),
    status VARCHAR(50) DEFAULT 'Pending',
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_seats (
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id),
    PRIMARY KEY (booking_id, seat_id)
);
