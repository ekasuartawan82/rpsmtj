-- Migration: Add versioning fields to wp_prodi_rps
-- Slice 5: Supports copy-as-draft — tracks version lineage and current flag.
-- parent_rps_id already exists; adding version_number + is_current.

ALTER TABLE wp_prodi_rps
  ADD COLUMN version_number INT       DEFAULT 1 COMMENT 'Version within same mata_kuliah lineage',
  ADD COLUMN is_current     TINYINT(1) DEFAULT 1 COMMENT '1 = active version, 0 = superseded';

CREATE INDEX idx_rps_version ON wp_prodi_rps (mata_kuliah_id, version_number);
CREATE INDEX idx_rps_is_current ON wp_prodi_rps (is_current);

-- Backfill: all existing records are version 1 and current
UPDATE wp_prodi_rps SET version_number = 1, is_current = 1 WHERE version_number IS NULL;

-- Verify
SELECT id, mata_kuliah_id, workflow_status, version_number, is_current, parent_rps_id
FROM wp_prodi_rps
ORDER BY id;
