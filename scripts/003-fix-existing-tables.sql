-- Fix existing tables if they have the wrong column names
-- This script will rename columns if they exist with old names

-- Check if old columns exist and rename them
DO $$
BEGIN
    -- Rename total_score to total if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'teams' AND column_name = 'total_score') THEN
        ALTER TABLE teams RENAME COLUMN total_score TO total;
    END IF;
    
    -- Rename gw_score to event_total if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'teams' AND column_name = 'gw_score') THEN
        ALTER TABLE teams RENAME COLUMN gw_score TO event_total;
    END IF;
    
    -- Rename team_name to entry_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'teams' AND column_name = 'team_name') THEN
        ALTER TABLE teams RENAME COLUMN team_name TO entry_name;
    END IF;
    
    -- Rename manager_name to player_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'teams' AND column_name = 'manager_name') THEN
        ALTER TABLE teams RENAME COLUMN manager_name TO player_name;
    END IF;
    
    -- Add last_rank column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'teams' AND column_name = 'last_rank') THEN
        ALTER TABLE teams ADD COLUMN last_rank INTEGER DEFAULT 0;
    END IF;
END $$;
