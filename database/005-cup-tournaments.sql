-- Cup Tournament System Database Schema
-- This script creates tables for managing cup tournaments with group and knockout phases

-- Main tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('group', 'knockout', 'mixed')), -- mixed = group then knockout
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

    -- Scoring settings
    gameweeks INTEGER[] NOT NULL, -- Array of gameweek numbers used for scoring

    -- Group stage settings (if applicable)
    num_groups INTEGER, -- Number of groups for group stage
    teams_per_group INTEGER, -- Target teams per group
    teams_advance_per_group INTEGER DEFAULT 2, -- How many advance from each group
    include_best_third BOOLEAN DEFAULT false, -- Whether to include best 3rd place teams

    -- Knockout settings (if applicable)
    knockout_gameweeks INTEGER[], -- Specific gameweeks for each knockout round
    knockout_legs INTEGER DEFAULT 1, -- 1 = single leg, 2 = two legs

    -- Metadata
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Tournament groups (for group stage tournaments)
CREATE TABLE IF NOT EXISTS tournament_groups (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL, -- 'Group A', 'Group B', etc.
    group_order INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tournament_id, group_name),
    UNIQUE(tournament_id, group_order)
);

-- Tournament participants (teams in tournaments/groups)
CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES tournament_groups(id) ON DELETE CASCADE, -- NULL for knockout-only

    -- Position tracking
    group_position INTEGER, -- Final position in group (1st, 2nd, 3rd, etc.)
    tournament_position INTEGER, -- Final position in tournament
    eliminated_in_round TEXT, -- 'group', 'round-16', 'quarter-final', etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tournament_id, team_id)
);

-- Tournament matches (for knockout rounds and tracking)
CREATE TABLE IF NOT EXISTS tournament_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

    -- Match details
    round_name TEXT NOT NULL, -- 'round-16', 'quarter-final', 'semi-final', 'final', etc.
    round_order INTEGER NOT NULL, -- 1, 2, 3, 4 for ordering rounds
    match_order INTEGER NOT NULL, -- Order within the round (for bracket positioning)

    -- Teams
    team1_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    team2_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    winner_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,

    -- Scoring
    team1_score INTEGER DEFAULT 0, -- Total points across match gameweeks
    team2_score INTEGER DEFAULT 0,
    gameweeks INTEGER[] NOT NULL, -- Gameweeks used for this match

    -- Match state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),

    -- Parent match tracking (for bracket structure)
    team1_from_match INTEGER REFERENCES tournament_matches(id), -- Winner of this match becomes team1
    team2_from_match INTEGER REFERENCES tournament_matches(id), -- Winner of this match becomes team2

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament standings/results (calculated view of current standings)
CREATE TABLE IF NOT EXISTS tournament_standings (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES tournament_groups(id) ON DELETE CASCADE,

    -- Statistics
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0, -- Total FPL points scored
    points_against INTEGER DEFAULT 0, -- Only relevant for head-to-head formats
    tournament_points INTEGER DEFAULT 0, -- Points in tournament (3 for win, 1 for draw, etc.)

    -- Position
    position INTEGER,
    qualified BOOLEAN DEFAULT false, -- Whether team has qualified for next round

    -- Calculated fields
    points_difference INTEGER GENERATED ALWAYS AS (points_for - points_against) STORED,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tournament_id, team_id, group_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(type);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team ON tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_group ON tournament_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_order);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_tournament ON tournament_standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_group ON tournament_standings(group_id);

-- Comments for documentation
COMMENT ON TABLE tournaments IS 'Main tournaments/cups table supporting both group and knockout formats';
COMMENT ON TABLE tournament_groups IS 'Groups within group-stage tournaments (Group A, B, C, etc.)';
COMMENT ON TABLE tournament_participants IS 'Teams participating in tournaments, with group assignments';
COMMENT ON TABLE tournament_matches IS 'Individual matches in knockout rounds with bracket structure';
COMMENT ON TABLE tournament_standings IS 'Current standings/statistics for teams in tournaments';

COMMENT ON COLUMN tournaments.gameweeks IS 'Array of gameweek numbers used for tournament scoring';
COMMENT ON COLUMN tournaments.knockout_gameweeks IS 'Specific gameweeks for each knockout round [QF_gws, SF_gws, F_gws]';
COMMENT ON COLUMN tournament_matches.team1_from_match IS 'Match ID whose winner becomes team1 (for bracket structure)';
COMMENT ON COLUMN tournament_matches.team2_from_match IS 'Match ID whose winner becomes team2 (for bracket structure)';