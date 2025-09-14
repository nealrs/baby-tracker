-- init.sql
-- SQL script to initialize the PostgreSQL database schema
-- based on the provided infant activity JSON schema.

-- Create the 'feeds' table for tracking feeding activities.
CREATE TABLE IF NOT EXISTS feeds (
    id SERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('bottle', 'breast')),
    breast_side TEXT CHECK (breast_side IN ('left', 'right', 'both')),
    breast_duration NUMERIC(5, 2), -- Duration in minutes, with up to 2 decimal places
    bottle_contents TEXT CHECK (bottle_contents IN ('breast', 'formula')),
    bottle_volume NUMERIC(5, 2), -- Volume in oz or mL
    bottle_volume_unit TEXT CHECK (bottle_volume_unit IN ('oz', 'mL')),
    notes TEXT
);

-- Create the 'pumps' table for tracking milk pumping sessions.
CREATE TABLE IF NOT EXISTS pumps (
    id SERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    breast_side TEXT NOT NULL CHECK (breast_side IN ('left', 'right', 'both')),
    volume NUMERIC(5, 2) NOT NULL,
    volume_unit TEXT NOT NULL CHECK (volume_unit IN ('oz', 'mL')),
    notes TEXT
);

-- Create the 'diapers' table for tracking diaper changes.
CREATE TABLE IF NOT EXISTS diapers (
    id SERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pee', 'poop', 'mixed', 'dry')),
    color TEXT,
    notes TEXT
);

-- Optional: Create indexes for faster queries on the 'time' column
CREATE INDEX IF NOT EXISTS idx_feeds_time ON feeds(time);
CREATE INDEX IF NOT EXISTS idx_pumps_time ON pumps(time);
CREATE INDEX IF NOT EXISTS idx_diapers_time ON diapers(time);
