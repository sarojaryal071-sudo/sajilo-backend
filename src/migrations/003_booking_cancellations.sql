CREATE TABLE IF NOT EXISTS booking_cancellations (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  cancelled_by_id INTEGER NOT NULL REFERENCES users(id),
  cancelled_by_role VARCHAR(20) NOT NULL,
  status_at_cancel VARCHAR(20) NOT NULL,
  worker_id INTEGER REFERENCES users(id),
  reason TEXT,
  booking_created_at TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);