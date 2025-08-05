-- Complete database reset - removes all data and recreates tables
-- WARNING: This will delete ALL existing data

-- Drop all tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS chips CASCADE;
DROP TABLE IF EXISTS team_summaries CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS league_metadata CASCADE;

-- Recreate all tables with correct schema
CREATE TABLE league_metadata (
    id SERIAL PRIMARY KEY,
    league_id INTEGER UNIQUE NOT NULL,
    league_name VARCHAR(255) NOT NULL,
    total_entries INTEGER DEFAULT 0,
    current_event INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teams (
    id INTEGER PRIMARY KEY, -- This is the 'entry' field from FPL API
    entry_name VARCHAR(255) NOT NULL, -- Team name
    player_name VARCHAR(255) NOT NULL, -- Manager name
    total INTEGER DEFAULT 0, -- Total score
    event_total INTEGER DEFAULT 0, -- GW score
    rank INTEGER DEFAULT 0,
    last_rank INTEGER DEFAULT 0,
    captain VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_summaries (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id),
    event_number INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    transfers INTEGER DEFAULT 0,
    transfers_cost INTEGER DEFAULT 0,
    overall_rank INTEGER DEFAULT 0,
    value INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    chip_used VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, event_number)
);

CREATE TABLE chips (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id),
    chip_type VARCHAR(50) NOT NULL,
    event_number INTEGER NOT NULL,
    used_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    fpl_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    team VARCHAR(100),
    price INTEGER DEFAULT 0
);

CREATE TABLE team_players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id),
    player_id INTEGER REFERENCES players(id),
    event_number INTEGER NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    is_vice_captain BOOLEAN DEFAULT FALSE,
    multiplier INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
