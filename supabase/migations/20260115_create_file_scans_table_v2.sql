-- =====================================================
-- VIRUSTOTAL INTEGRATION - FILE SCANS TABLE (FIXED)
-- =====================================================
-- Migration: Create file_scans table for VirusTotal scanning results
-- Created: 2025-01-15
-- Author: Alex (Engineer)
-- Version: 2.0 (Fixed - removed profiles dependency)
-- Description: Stores virus scanning results from VirusTotal API
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE TABLE: file_scans
-- =====================================================

CREATE TABLE IF NOT EXISTS file_scans (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File Information
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  file_hash_sha256 TEXT NOT NULL,
  file_mime_type TEXT,
  
  -- User Reference
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scan Status
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    scan_status IN ('pending', 'scanning', 'clean', 'infected', 'error', 'timeout')
  ),
  
  -- Threat Information
  threat_name TEXT,
  threat_category TEXT,
  threat_severity TEXT CHECK (
    threat_severity IS NULL OR 
    threat_severity IN ('low', 'medium', 'high', 'critical')
  ),
  
  -- VirusTotal Details
  virustotal_scan_id TEXT,
  virustotal_permalink TEXT,
  engines_detected INTEGER DEFAULT 0 CHECK (engines_detected >= 0),
  engines_total INTEGER DEFAULT 0 CHECK (engines_total >= 0),
  
  -- Timestamps
  scan_started_at TIMESTAMP WITH TIME ZONE,
  scan_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Full Response (JSON)
  virustotal_response JSONB,
  
  -- Error Information
  error_message TEXT,
  error_code TEXT,
  
  -- Constraints
  CONSTRAINT unique_file_hash UNIQUE (file_hash_sha256),
  CONSTRAINT valid_timestamps CHECK (
    scan_completed_at IS NULL OR 
    scan_completed_at >= scan_started_at
  ),
  CONSTRAINT valid_engines CHECK (
    engines_detected <= engines_total
  )
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for user queries (most common)
CREATE INDEX IF NOT EXISTS idx_file_scans_user_id 
  ON file_scans(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_file_scans_status 
  ON file_scans(scan_status);

-- Index for file path lookups
CREATE INDEX IF NOT EXISTS idx_file_scans_file_path 
  ON file_scans(file_path);

-- Index for hash lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_file_scans_file_hash 
  ON file_scans(file_hash_sha256);

-- Index for recent scans (sorted by date)
CREATE INDEX IF NOT EXISTS idx_file_scans_created_at 
  ON file_scans(created_at DESC);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_file_scans_user_status 
  ON file_scans(user_id, scan_status);

-- Index for infected files (security monitoring)
CREATE INDEX IF NOT EXISTS idx_file_scans_infected 
  ON file_scans(scan_status) 
  WHERE scan_status = 'infected';

-- =====================================================
-- 3. CREATE FUNCTION: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_file_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trigger_update_file_scans_updated_at
  BEFORE UPDATE ON file_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_file_scans_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE file_scans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES (FIXED - NO PROFILES DEPENDENCY)
-- =====================================================

-- Policy 1: Users can view only their own scans
CREATE POLICY "Users can view own scans"
  ON file_scans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own scans
CREATE POLICY "Users can insert own scans"
  ON file_scans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Service role can view all scans (for Edge Functions)
CREATE POLICY "Service role can view all scans"
  ON file_scans
  FOR SELECT
  TO service_role
  USING (true);

-- Policy 4: Service role can insert scans (for Edge Functions)
CREATE POLICY "Service role can insert scans"
  ON file_scans
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 5: Service role can update scans (for Edge Functions)
CREATE POLICY "Service role can update scans"
  ON file_scans
  FOR UPDATE
  TO service_role
  USING (true);

-- Policy 6: Service role can delete scans (cleanup)
CREATE POLICY "Service role can delete scans"
  ON file_scans
  FOR DELETE
  TO service_role
  USING (true);

-- NOTE: Admin policy removed - can be added later if profiles table exists

-- =====================================================
-- 7. CREATE FUNCTION: Get scan statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_scan_statistics(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_scans BIGINT,
  clean_files BIGINT,
  infected_files BIGINT,
  pending_scans BIGINT,
  error_scans BIGINT,
  infection_rate NUMERIC,
  avg_scan_duration INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_scans,
    COUNT(*) FILTER (WHERE scan_status = 'clean')::BIGINT as clean_files,
    COUNT(*) FILTER (WHERE scan_status = 'infected')::BIGINT as infected_files,
    COUNT(*) FILTER (WHERE scan_status = 'pending')::BIGINT as pending_scans,
    COUNT(*) FILTER (WHERE scan_status = 'error')::BIGINT as error_scans,
    ROUND(
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE scan_status = 'infected')::NUMERIC / COUNT(*)::NUMERIC) * 100
        ELSE 0
      END, 
      2
    ) as infection_rate,
    AVG(scan_completed_at - scan_started_at) as avg_scan_duration
  FROM file_scans
  WHERE 
    (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE FUNCTION: Cleanup old scans
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_file_scans(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete scans older than specified days
  DELETE FROM file_scans
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
  AND scan_status IN ('clean', 'error', 'timeout');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CREATE FUNCTION: Get recent threats
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_threats(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  file_name TEXT,
  threat_name TEXT,
  threat_severity TEXT,
  detected_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.file_name,
    fs.threat_name,
    fs.threat_severity,
    fs.scan_completed_at as detected_at,
    fs.user_id
  FROM file_scans fs
  WHERE fs.scan_status = 'infected'
  ORDER BY fs.scan_completed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Grant permissions on table
GRANT SELECT, INSERT ON file_scans TO authenticated;
GRANT ALL ON file_scans TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_scan_statistics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_file_scans TO service_role;
GRANT EXECUTE ON FUNCTION get_recent_threats TO authenticated, service_role;

-- =====================================================
-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE file_scans IS 
  'Stores virus scanning results from VirusTotal API integration';

COMMENT ON COLUMN file_scans.file_hash_sha256 IS 
  'SHA256 hash of file content, used for deduplication and VirusTotal lookup';

COMMENT ON COLUMN file_scans.scan_status IS 
  'Current status: pending (waiting), scanning (in progress), clean (safe), infected (threat detected), error (failed), timeout (took too long)';

COMMENT ON COLUMN file_scans.virustotal_response IS 
  'Complete JSON response from VirusTotal API for debugging and detailed analysis';

COMMENT ON FUNCTION get_scan_statistics IS 
  'Returns scanning statistics for a user or globally';

COMMENT ON FUNCTION cleanup_old_file_scans IS 
  'Deletes old scan records to maintain database size';

COMMENT ON FUNCTION get_recent_threats IS 
  'Returns recently detected threats for security monitoring';

-- =====================================================
-- 12. CREATE VIEW: Active scans summary
-- =====================================================

CREATE OR REPLACE VIEW active_scans_summary AS
SELECT
  user_id,
  COUNT(*) as total_active_scans,
  COUNT(*) FILTER (WHERE scan_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE scan_status = 'scanning') as scanning_count,
  MIN(created_at) as oldest_scan,
  MAX(created_at) as newest_scan
FROM file_scans
WHERE scan_status IN ('pending', 'scanning')
GROUP BY user_id;

COMMENT ON VIEW active_scans_summary IS 
  'Summary of currently active (pending/scanning) file scans per user';

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- =====================================================
-- Changes from v1:
-- - Removed "Admins can view all scans" policy (depends on profiles table)
-- - All other functionality preserved
-- - Safe to run without profiles table
-- =====================================================