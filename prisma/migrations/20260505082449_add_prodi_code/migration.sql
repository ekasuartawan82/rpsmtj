-- Migration: Add prodi_code column to wp_prodi_rps
-- Phase 1: Minimal change to test complete evidence workflow

-- Add prodi_code column
ALTER TABLE wp_prodi_rps
ADD COLUMN prodi_code VARCHAR(10) DEFAULT 'MTJ' AFTER mata_kuliah_id;

-- Add index for performance
CREATE INDEX idx_rps_prodi_code ON wp_prodi_rps(prodi_code);

-- Update existing records
UPDATE wp_prodi_rps SET prodi_code = 'MTJ' WHERE prodi_code IS NULL;

-- Verify
SELECT COUNT(*) as total_rps, prodi_code, COUNT(*) as count
FROM wp_prodi_rps
GROUP BY prodi_code;
