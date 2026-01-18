-- World Cup Tournament Feature - Database Migration
-- Adds support for group stage + knockout format with custom bracket seeding

-- Add knockout seeding configuration to tournaments table
-- Stores the mapping of bracket positions to group positions (e.g., "R16_1": {"team1": "group_A_1", "team2": "group_B_2"})
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS
    knockout_seeding JSONB DEFAULT NULL;

-- Add group stage gameweeks (separate from knockout gameweeks)
-- Array of gameweek numbers for each matchday in the group stage
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS
    group_stage_gameweeks INTEGER[] DEFAULT NULL;

-- Track group stage completion status
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS
    group_stage_status TEXT DEFAULT 'pending'
    CHECK (group_stage_status IN ('pending', 'active', 'completed'));

-- Add group_id to tournament_matches for group stage matches
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS
    group_id INTEGER REFERENCES tournament_groups(id) ON DELETE CASCADE;

-- Add match_type to distinguish between group and knockout matches
-- Using DO block to handle the case where column might already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tournament_matches' AND column_name = 'match_type'
    ) THEN
        ALTER TABLE tournament_matches ADD COLUMN match_type TEXT NOT NULL DEFAULT 'knockout';
        ALTER TABLE tournament_matches ADD CONSTRAINT tournament_matches_match_type_check
            CHECK (match_type IN ('group', 'knockout'));
    END IF;
END $$;

-- Add matchday number for group stage matches
-- Matchday 1, 2, 3, etc. for round-robin scheduling
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS
    matchday INTEGER DEFAULT NULL;

-- Create index for efficient group match queries
CREATE INDEX IF NOT EXISTS idx_tournament_matches_group ON tournament_matches(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_matches_type ON tournament_matches(tournament_id, match_type);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_matchday ON tournament_matches(tournament_id, matchday) WHERE matchday IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tournaments.knockout_seeding IS 'JSON mapping of knockout bracket positions to group positions (e.g., {"R16_1": {"team1": "group_A_1", "team2": "group_B_2"}})';
COMMENT ON COLUMN tournaments.group_stage_gameweeks IS 'Array of gameweek numbers for each group stage matchday';
COMMENT ON COLUMN tournaments.group_stage_status IS 'Status of group stage: pending, active, or completed';
COMMENT ON COLUMN tournament_matches.group_id IS 'Reference to tournament_groups for group stage matches';
COMMENT ON COLUMN tournament_matches.match_type IS 'Type of match: group (group stage) or knockout (elimination rounds)';
COMMENT ON COLUMN tournament_matches.matchday IS 'Matchday number within group stage (1, 2, 3, etc.)';
