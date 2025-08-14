-- Migration for Automated Sync Support
-- Run this after your existing schema to add automation support

-- 1. Add FPL Events table (from bootstrap data)
CREATE TABLE IF NOT EXISTS fpl_events (
    id INTEGER PRIMARY KEY,              -- Event ID from FPL API
    name VARCHAR(255) NOT NULL,          -- "Gameweek 1"
    deadline_time TIMESTAMP,             -- When transfers deadline passes
    is_current BOOLEAN DEFAULT FALSE,    -- Current gameweek flag
    is_next BOOLEAN DEFAULT FALSE,       -- Next gameweek flag  
    is_previous BOOLEAN DEFAULT FALSE,   -- Previous gameweek flag
    finished BOOLEAN DEFAULT FALSE,      -- Event is finished
    data_checked BOOLEAN DEFAULT FALSE,  -- Final data has been processed
    average_entry_score INTEGER DEFAULT 0, -- Average score for this gameweek
    highest_score INTEGER DEFAULT 0,     -- Highest score this gameweek
    chip_plays JSONB,                    -- Chip usage stats from FPL
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add Sync Logs table for monitoring
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,      -- 'full', 'incremental', 'scores', 'bootstrap'
    status VARCHAR(20) NOT NULL,         -- 'started', 'completed', 'failed', 'partial'
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    records_processed INTEGER DEFAULT 0,
    teams_updated INTEGER DEFAULT 0,
    summaries_updated INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    triggered_by VARCHAR(50),            -- 'cron', 'manual', 'webhook'
    fpl_api_calls INTEGER DEFAULT 0,     -- Track API usage
    current_event INTEGER,               -- Which gameweek we synced
    metadata JSONB                       -- Additional sync metadata
);

-- 3. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_team_summaries_team_event ON team_summaries(team_id, event_number);
CREATE INDEX IF NOT EXISTS idx_team_summaries_event ON team_summaries(event_number);
CREATE INDEX IF NOT EXISTS idx_team_summaries_updated ON team_summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_teams_updated ON teams(updated_at);
CREATE INDEX IF NOT EXISTS idx_teams_rank ON teams(rank);
CREATE INDEX IF NOT EXISTS idx_fpl_events_current ON fpl_events(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_fpl_events_finished ON fpl_events(finished);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at);

-- 4. Add helpful views for monitoring
CREATE OR REPLACE VIEW sync_status AS
SELECT 
    sync_type,
    status,
    started_at,
    completed_at,
    duration_ms,
    records_processed,
    error_details,
    ROW_NUMBER() OVER (PARTITION BY sync_type ORDER BY started_at DESC) as recency_rank
FROM sync_logs
ORDER BY started_at DESC;

CREATE OR REPLACE VIEW current_gameweek_info AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.deadline_time,
    e.finished,
    e.is_current,
    e.average_entry_score,
    e.highest_score,
    COUNT(ts.id) as teams_with_data,
    AVG(ts.points) as league_average,
    MAX(ts.points) as league_highest
FROM fpl_events e
LEFT JOIN team_summaries ts ON e.id = ts.event_number
WHERE e.is_current = true
GROUP BY e.id, e.name, e.deadline_time, e.finished, e.is_current, e.average_entry_score, e.highest_score;

-- 5. Add sync configuration table
CREATE TABLE IF NOT EXISTS sync_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default sync configuration
INSERT INTO sync_config (key, value, description) VALUES
('league_id', '66185', 'FPL League ID to sync'),
('sync_frequency_minutes', '60', 'How often to run incremental sync'),
('full_sync_hour', '3', 'Hour of day to run full sync (0-23)'),
('max_api_calls_per_sync', '50', 'Rate limiting for FPL API'),
('retry_attempts', '3', 'Number of retries on failure'),
('enable_notifications', 'false', 'Enable error notifications')
ON CONFLICT (key) DO NOTHING;

-- 6. Add function to log sync events
CREATE OR REPLACE FUNCTION log_sync_start(
    p_sync_type VARCHAR(50),
    p_triggered_by VARCHAR(50) DEFAULT 'unknown',
    p_current_event INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    sync_id INTEGER;
BEGIN
    INSERT INTO sync_logs (sync_type, status, triggered_by, current_event)
    VALUES (p_sync_type, 'started', p_triggered_by, p_current_event)
    RETURNING id INTO sync_id;
    
    RETURN sync_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_sync_complete(
    p_sync_id INTEGER,
    p_status VARCHAR(20) DEFAULT 'completed',
    p_records_processed INTEGER DEFAULT 0,
    p_teams_updated INTEGER DEFAULT 0,
    p_summaries_updated INTEGER DEFAULT 0,
    p_events_updated INTEGER DEFAULT 0,
    p_errors_count INTEGER DEFAULT 0,
    p_error_details TEXT DEFAULT NULL,
    p_fpl_api_calls INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE sync_logs SET
        status = p_status,
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        records_processed = p_records_processed,
        teams_updated = p_teams_updated,
        summaries_updated = p_summaries_updated,
        events_updated = p_events_updated,
        errors_count = p_errors_count,
        error_details = p_error_details,
        fpl_api_calls = p_fpl_api_calls,
        metadata = p_metadata
    WHERE id = p_sync_id;
END;
$$ LANGUAGE plpgsql;