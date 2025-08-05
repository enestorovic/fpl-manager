-- Alternative: Clear data only (keeps table structure)
-- This is safer if you want to keep the table structure

-- Clear all data in correct order
DELETE FROM team_players;
DELETE FROM chips;
DELETE FROM team_summaries;
DELETE FROM teams;
DELETE FROM players;
DELETE FROM league_metadata;

-- Reset any auto-increment sequences
ALTER SEQUENCE IF EXISTS league_metadata_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS team_summaries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS chips_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS players_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS team_players_id_seq RESTART WITH 1;
