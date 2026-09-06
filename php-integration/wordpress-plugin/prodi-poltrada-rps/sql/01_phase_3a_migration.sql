-- ==============================================================================
-- Migration: Phase 3A Multi-Prodi Infrastructure (Option B: Usermeta Architecture)
-- Target: WordPress + MySQL (Poltrada Bali)
-- Note: User roles & prodi codes are maintained via wp_usermeta (rps_role, rps_prodi_code)
--       per Prodi_RPS_Migration::migrate_to_usermeta(). No extra table needed.
-- ==============================================================================

-- 1. Add prodi_code column to wp_prodi_kurikulum (if table exists and column missing)
SET @exist_kurikulum = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum'
);

SET @col_exist_kurikulum = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_kurikulum' AND column_name = 'prodi_code'
);

SET @sql_kurikulum = IF(
  @exist_kurikulum > 0 AND @col_exist_kurikulum = 0,
  'ALTER TABLE `wp_prodi_kurikulum` ADD COLUMN `prodi_code` VARCHAR(10) NULL, ADD INDEX `idx_kurikulum_prodi` (`prodi_code`);',
  'SELECT "wp_prodi_kurikulum.prodi_code already exists or table not present";'
);
PREPARE stmt_kurikulum FROM @sql_kurikulum;
EXECUTE stmt_kurikulum;
DEALLOCATE PREPARE stmt_kurikulum;

-- 2. Add prodi_code column to wp_prodi_rps (if table exists and column missing)
SET @exist_rps = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps'
);

SET @col_exist_rps = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'wp_prodi_rps' AND column_name = 'prodi_code'
);

SET @sql_rps = IF(
  @exist_rps > 0 AND @col_exist_rps = 0,
  'ALTER TABLE `wp_prodi_rps` ADD COLUMN `prodi_code` VARCHAR(10) NULL, ADD INDEX `idx_rps_prodi` (`prodi_code`);',
  'SELECT "wp_prodi_rps.prodi_code already exists";'
);
PREPARE stmt_rps FROM @sql_rps;
EXECUTE stmt_rps;
DEALLOCATE PREPARE stmt_rps;

-- 3. Initial Backfill: Ensure existing records have default prodi_code
UPDATE `wp_prodi_rps` SET `prodi_code` = 'MTJ' WHERE `prodi_code` IS NULL OR `prodi_code` = '';

SET @sql_backfill_kurikulum = IF(
  @exist_kurikulum > 0,
  'UPDATE `wp_prodi_kurikulum` SET `prodi_code` = "MTJ" WHERE `prodi_code` IS NULL OR `prodi_code` = "";',
  'SELECT "wp_prodi_kurikulum not present for backfill";'
);
PREPARE stmt_bf_kur FROM @sql_backfill_kurikulum;
EXECUTE stmt_bf_kur;
DEALLOCATE PREPARE stmt_bf_kur;
