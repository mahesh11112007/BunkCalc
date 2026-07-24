-- Neon PostgreSQL Database Migration Schema for Attendance Register App

CREATE TABLE IF NOT EXISTS users (
    roll_no VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    college_name VARCHAR(255),
    pin VARCHAR(100) NOT NULL,
    program VARCHAR(255),
    target_threshold INT DEFAULT 75,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_data (
    roll_no VARCHAR(50) PRIMARY KEY REFERENCES users(roll_no) ON DELETE CASCADE,
    calendar_json JSONB NOT NULL,
    attendance_json JSONB NOT NULL,
    subjects_json JSONB NOT NULL,
    target_threshold INT DEFAULT 75,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
