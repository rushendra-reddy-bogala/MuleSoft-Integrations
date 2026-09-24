-- Flight Management System Database Schema & Initial Data
-- Database Engine: MySQL 8.x

CREATE DATABASE IF NOT EXISTS flight_db;
USE flight_db;

DROP TABLE IF EXISTS flights;

CREATE TABLE flights (
    flight_id VARCHAR(20) PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    available_seats INT NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Sample Data
INSERT INTO flights (flight_id, airline, source, destination, departure_time, arrival_time, available_seats, price, status)
VALUES 
('AI101', 'Air India', 'Hyderabad', 'Delhi', '2026-10-01 10:00:00', '2026-10-01 12:30:00', 150, 5500.00, 'Scheduled'),
('6E202', 'IndiGo', 'Bangalore', 'Mumbai', '2026-10-01 14:00:00', '2026-10-01 15:45:00', 180, 4200.00, 'Scheduled'),
('UK303', 'Vistara', 'Delhi', 'Hyderabad', '2026-10-02 08:30:00', '2026-10-02 11:00:00', 120, 6800.00, 'Scheduled');
