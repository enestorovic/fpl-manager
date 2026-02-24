-- Add knockout_rounds_config column to tournaments table
-- Stores per-round configuration (name + gameweeks) for World Cup knockout stages
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS knockout_rounds_config JSONB DEFAULT NULL;

-- Example structure:
-- [
--   { "round_name": "Round of 16", "round_order": 1, "gameweeks": [21, 22] },
--   { "round_name": "Quarter-Final", "round_order": 2, "gameweeks": [24, 25] },
--   { "round_name": "Semi-Final",    "round_order": 3, "gameweeks": [27, 28] },
--   { "round_name": "Final",         "round_order": 4, "gameweeks": [30] }
-- ]
